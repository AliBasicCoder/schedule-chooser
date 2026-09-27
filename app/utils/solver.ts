import type {
  ClassItem,
  Group,
  Preferences,
  ScheduleScores,
  ScheduleSelection,
  GeneratedSchedule,
  SolverConfig,
  SolverResult,
} from '../types/schedule';
import { hasBlocked, hasOverlap, sessionToSlotKeys, timeToMin } from './time';

/**
 * Score a candidate schedule based on:
 * 1. Time-fit: minutes falling outside the user's preferred window
 * 2. Days: count of distinct days with scheduled classes
 * 3. Gaps: total idle minutes between the earliest and latest class on each day
 */
export function scoreSchedule(
  selections: ScheduleSelection[],
  classMap: Record<string, ClassItem>,
  prefs: Preferences
): ScheduleScores {
  const prefStart = timeToMin(prefs.timeWindow.start);
  const prefEnd = timeToMin(prefs.timeWindow.end);

  const concreteSessions: { day: string; startMin: number; endMin: number }[] = [];

  for (const sel of selections) {
    const cls = classMap[sel.classId];
    if (!cls) continue;
    for (const idx of sel.sessionIndices) {
      const s = cls.sessions[idx];
      if (s) {
        concreteSessions.push({
          day: s.day,
          startMin: timeToMin(s.start),
          endMin: timeToMin(s.end),
        });
      }
    }
  }

  // Group concrete sessions by active day
  const byDay: Record<string, { startMin: number; endMin: number }[]> = {};
  for (const s of concreteSessions) {
    if (!byDay[s.day]) byDay[s.day] = [];
    byDay[s.day].push(s);
  }

  // 1. Time fit score: penalize arriving before preferred arrival time (prefStart)
  // or staying past preferred departure time (prefEnd) on each active day.
  let timeFit = 0;
  for (const daySessions of Object.values(byDay)) {
    if (daySessions.length === 0) continue;
    const earliestStart = daySessions.reduce((min, s) => Math.min(min, s.startMin), Infinity);
    const latestEnd = daySessions.reduce((max, s) => Math.max(max, s.endMin), -Infinity);

    if (earliestStart < prefStart) {
      timeFit += prefStart - earliestStart;
    }
    if (latestEnd > prefEnd) {
      timeFit += latestEnd - prefEnd;
    }
  }

  // 2. Days score
  const days = Object.keys(byDay).length;

  // 3. Gaps score
  let gaps = 0;
  for (const daySessions of Object.values(byDay)) {
    daySessions.sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < daySessions.length; i++) {
      const gap = daySessions[i].startMin - daySessions[i - 1].endMin;
      if (gap > 0) gaps += gap;
    }
  }

  return { timeFit, days, gaps };
}

// ────────────────────────────────────────────────────────────────────────────
// Group tree helpers
// ────────────────────────────────────────────────────────────────────────────

interface GroupTreeContext {
  groupById: Map<string, Group>;
  childrenOf: Map<string, string[]>;  // parentId → child group IDs
}

/** Build parent→children lookup from a flat group list */
function buildGroupTree(groups: Group[]): GroupTreeContext {
  const groupById = new Map<string, Group>();
  const childrenOf = new Map<string, string[]>();

  for (const g of groups) {
    groupById.set(g.id, g);
  }

  for (const g of groups) {
    const pid = g.parentId ?? null;
    if (pid !== null) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(g.id);
    }
  }

  return { groupById, childrenOf };
}

/** Get all descendant group IDs (inclusive) */
function getDescendants(groupId: string, ctx: GroupTreeContext): string[] {
  const result: string[] = [groupId];
  const children = ctx.childrenOf.get(groupId) || [];
  for (const childId of children) {
    result.push(...getDescendants(childId, ctx));
  }
  return result;
}

/** Get all ancestor group IDs (exclusive — does not include self) */
function getAncestors(groupId: string, ctx: GroupTreeContext): string[] {
  const result: string[] = [];
  let current = ctx.groupById.get(groupId);
  while (current && current.parentId) {
    result.push(current.parentId);
    current = ctx.groupById.get(current.parentId);
  }
  return result;
}

/**
 * Get all valid group-selection combinations for a root group's subtree.
 *
 * Returns an array of group-ID arrays. Each inner array is a set of selected
 * group IDs (the root + chosen descendants) that form a valid selection.
 *
 * For childrenConflict parents: branch on each child (pick exactly one).
 * For non-childrenConflict parents: include all children.
 * Recurse into each child's subtree.
 */
function getGroupCombinations(
  groupId: string,
  ctx: GroupTreeContext,
  manualChoices?: Record<string, { groupIds?: string[]; subgroupIds?: string[] }>
): string[][] {
  const children = ctx.childrenOf.get(groupId) || [];
  const group = ctx.groupById.get(groupId)!;

  if (children.length === 0) {
    // Leaf group — just itself
    return [[groupId]];
  }

  // If manual choices exist for this group, filter children accordingly
  let activeChildren = children;
  const choice = manualChoices?.[groupId];
  const chosenList = choice?.groupIds || choice?.subgroupIds;
  if (chosenList && chosenList.length > 0) {
    const chosenSet = new Set(chosenList);
    const filtered = children.filter((c) => chosenSet.has(c));
    if (filtered.length > 0) {
      activeChildren = filtered;
    }
  }

  if (group.childrenConflict) {
    // Pick exactly one child, recurse into its subtree
    const result: string[][] = [];
    for (const childId of activeChildren) {
      const childCombos = getGroupCombinations(childId, ctx, manualChoices);
      for (const combo of childCombos) {
        result.push([groupId, ...combo]);
      }
    }
    return result;
  } else {
    // Include active children — cartesian product of their combos
    let combos: string[][] = [[groupId]];
    for (const childId of activeChildren) {
      const childCombos = getGroupCombinations(childId, ctx, manualChoices);
      const newCombos: string[][] = [];
      for (const existing of combos) {
        for (const childCombo of childCombos) {
          newCombos.push([...existing, ...childCombo]);
        }
      }
      combos = newCombos;
    }
    return combos;
  }
}

// ────────────────────────────────────────────────────────────────────────────

type Decision =
  | { type: 'standalone'; classObj: ClassItem }
  | { type: 'group'; group: Group };

/**
 * Core backtracking schedule generator.
 */
export function generateSchedules(
  config: SolverConfig,
  onProgress?: (found: number, checked: number) => void
): SolverResult {
  const {
    classes,
    groups,
    blockedSlots,
    pinnedClasses,
    crossedOff = [],
    groupMode,
    manualGroupChoices,
    preferences,
    maxResults = 500,
  } = config;

  const classMap: Record<string, ClassItem> = {};
  for (const c of classes) classMap[c.id] = c;

  const blockedSet = new Set(blockedSlots);
  const pinnedSet = new Set(Object.keys(pinnedClasses || {}));
  const crossedSet = new Set(crossedOff);

  // Use a higher internal generation limit so the post-sort has a diverse pool.
  const generationLimit = Math.min(maxResults * 20, 10000);

  // Pre-sort each class's sessions by time-fit penalty so the solver
  // explores best-fitting sessions first (closest to the preferred window).
  const prefStartMin = timeToMin(preferences.timeWindow.start);
  const prefEndMin = timeToMin(preferences.timeWindow.end);
  const sortedSessionOrder: Record<string, number[]> = {};
  for (const cls of classes) {
    const ranked = cls.sessions
      .map((s, i) => {
        const sStart = timeToMin(s.start);
        const sEnd = timeToMin(s.end);
        const penalty = Math.max(0, prefStartMin - sStart) + Math.max(0, sEnd - prefEndMin);
        return { idx: i, penalty };
      })
      .sort((a, b) => a.penalty - b.penalty);
    sortedSessionOrder[cls.id] = ranked.map((r) => r.idx);
  }

  // Pre-validate pinned classes
  for (const [classId] of Object.entries(pinnedClasses || {})) {
    if (!classMap[classId]) {
      return {
        schedules: [],
        totalFound: 0,
        capped: false,
        error: `Pinned class "${classId}" not found or was crossed off.`,
      };
    }
  }

  const standaloneClasses = classes.filter((c) => c.groupId === null || c.groupId === undefined);

  // Build a map of groupId → classes that directly belong to that group
  const classesByGroup: Record<string, ClassItem[]> = {};
  for (const c of classes) {
    if (c.groupId) {
      if (!classesByGroup[c.groupId]) classesByGroup[c.groupId] = [];
      classesByGroup[c.groupId].push(c);
    }
  }

  // Prune groups whose entire subtree has no remaining classes.
  // This handles the case where a course is crossed off: its classes are
  // filtered out, but its groups (marked required) would otherwise block
  // the solver from finding any solution.
  const tempTreeCtx = buildGroupTree(groups);
  function subtreeHasClasses(groupId: string): boolean {
    if (classesByGroup[groupId]?.length > 0) return true;
    const children = tempTreeCtx.childrenOf.get(groupId) || [];
    return children.some((childId) => subtreeHasClasses(childId));
  }

  const activeGroups = groups.filter((g) => subtreeHasClasses(g.id));

  // Build group tree from the pruned group list
  const treeCtx = buildGroupTree(activeGroups);

  // Identify root groups (no parent, or parent was pruned away)
  const activeGroupIds = new Set(activeGroups.map((g) => g.id));
  const rootGroups = activeGroups.filter(
    (g) => !g.parentId || !activeGroupIds.has(g.parentId)
  );

  // Collect all classes belonging to a group and its descendants
  function getClassesForGroupTree(groupId: string): ClassItem[] {
    const descendantIds = getDescendants(groupId, treeCtx);
    const result: ClassItem[] = [];
    for (const gid of descendantIds) {
      if (classesByGroup[gid]) {
        result.push(...classesByGroup[gid]);
      }
    }
    return result;
  }

  const decisions: Decision[] = [];
  for (const c of standaloneClasses) {
    decisions.push({ type: 'standalone', classObj: c });
  }

  const reqGroups = rootGroups.filter((g) => g.required);
  const optGroups = rootGroups.filter((g) => !g.required);
  for (const g of [...reqGroups, ...optGroups]) {
    decisions.push({ type: 'group', group: g });
  }

  const results: GeneratedSchedule[] = [];
  const occupied = new Set<string>();
  const excludedGroups = new Set<string>();
  const currentSchedule: ScheduleSelection[] = [];
  let checked = 0;
  let lastProgress = Date.now();

  function tryAddClass(cls: ClassItem, onSuccess: () => void): void {
    if (crossedSet.has(cls.id)) return;

    const isPinned = pinnedSet.has(cls.id);
    const pinnedSessionIdx = pinnedClasses?.[cls.id];

    if (cls.attendAllSessions) {
      for (let i = 0; i < cls.sessions.length; i++) {
        if (crossedSet.has(`${cls.id}#${i}`)) return;
      }
      const allSlots: string[] = [];
      for (const s of cls.sessions) {
        allSlots.push(...sessionToSlotKeys(s));
      }
      if (hasOverlap(allSlots, occupied) || hasBlocked(allSlots, blockedSet)) return;

      for (const k of allSlots) occupied.add(k);
      currentSchedule.push({ classId: cls.id, sessionIndices: cls.sessions.map((_, i) => i) });
      onSuccess();
      currentSchedule.pop();
      for (const k of allSlots) occupied.delete(k);
    } else {
      const sessionOrder = sortedSessionOrder[cls.id] || cls.sessions.map((_, idx) => idx);
      for (const i of sessionOrder) {
        if (crossedSet.has(`${cls.id}#${i}`)) continue;
        if (isPinned && pinnedSessionIdx !== null && pinnedSessionIdx !== undefined && pinnedSessionIdx !== i) {
          continue;
        }

        const session = cls.sessions[i];
        const slots = sessionToSlotKeys(session);
        if (hasOverlap(slots, occupied) || hasBlocked(slots, blockedSet)) continue;

        for (const k of slots) occupied.add(k);
        currentSchedule.push({ classId: cls.id, sessionIndices: [i] });
        onSuccess();
        currentSchedule.pop();
        for (const k of slots) occupied.delete(k);
      }
    }
  }

  function processGroupClasses(clsList: ClassItem[], idx: number, afterDone: () => void): void {
    if (idx >= clsList.length) {
      afterDone();
      return;
    }
    if (results.length >= generationLimit) return;

    tryAddClass(clsList[idx], () => {
      processGroupClasses(clsList, idx + 1, afterDone);
    });
  }

  function backtrack(decIdx: number): void {
    if (results.length >= generationLimit) return;

    checked++;
    const now = Date.now();
    if (onProgress && now - lastProgress > 250) {
      onProgress(results.length, checked);
      lastProgress = now;
    }

    if (decIdx >= decisions.length) {
      const scores = scoreSchedule(currentSchedule, classMap, preferences);
      results.push({
        selections: currentSchedule.map((s) => ({ ...s, sessionIndices: [...s.sessionIndices] })),
        scores,
      });
      return;
    }

    const dec = decisions[decIdx];

    if (dec.type === 'standalone') {
      // Standalone classes are always required — the user explicitly added them.
      tryAddClass(dec.classObj, () => backtrack(decIdx + 1));
    } else if (dec.type === 'group') {
      const group = dec.group;

      if (excludedGroups.has(group.id)) {
        if (group.required) return;
        backtrack(decIdx + 1);
        return;
      }

      const allGroupClasses = getClassesForGroupTree(group.id);
      if (allGroupClasses.length === 0) {
        if (group.required) return;
        backtrack(decIdx + 1);
        return;
      }

      // If optional and no class in this group is pinned, explore the "skip group" branch first.
      if (!group.required) {
        const hasPinnedInGroup = allGroupClasses.some((c) => pinnedSet.has(c.id));
        if (!hasPinnedInGroup) {
          backtrack(decIdx + 1);
        }
      }

      // Determine group selection combinations
      const combos = getGroupCombinations(
        group.id,
        treeCtx,
        groupMode === 'manual' ? manualGroupChoices : undefined
      );

      // Apply group-level conflicts: exclude conflicting groups and their descendants
      const newExclusions: string[] = [];
      for (const gid of (group.conflictsWith || [])) {
        if (!excludedGroups.has(gid)) {
          const descendants = getDescendants(gid, treeCtx);
          for (const d of descendants) {
            if (!excludedGroups.has(d)) {
              newExclusions.push(d);
              excludedGroups.add(d);
            }
          }
        }
      }

      for (const combo of combos) {
        if (results.length >= generationLimit) break;

        // combo is a list of selected group IDs in this tree
        // Collect classes that directly belong to any selected group
        const selectedGroupIds = new Set(combo);
        const selectedClasses: ClassItem[] = [];
        for (const gid of selectedGroupIds) {
          if (classesByGroup[gid]) {
            selectedClasses.push(...classesByGroup[gid]);
          }
        }

        if (selectedClasses.length === 0 && group.required) continue;

        // Check if any pinned class's group is outside this combo
        let pinConflict = false;
        for (const c of allGroupClasses) {
          if (pinnedSet.has(c.id) && c.groupId && !selectedGroupIds.has(c.groupId)) {
            pinConflict = true;
            break;
          }
        }
        if (pinConflict) continue;

        // Apply cross-group conflicts from selected child groups
        const comboExclusions: string[] = [];
        for (const gid of selectedGroupIds) {
          const g = treeCtx.groupById.get(gid);
          if (g && g.conflictsWith) {
            for (const conflictGid of g.conflictsWith) {
              const descendants = getDescendants(conflictGid, treeCtx);
              for (const d of descendants) {
                if (!excludedGroups.has(d)) {
                  comboExclusions.push(d);
                  excludedGroups.add(d);
                }
              }
            }
          }
        }

        processGroupClasses(selectedClasses, 0, () => {
          backtrack(decIdx + 1);
        });

        // Undo combo-specific exclusions
        for (const d of comboExclusions) excludedGroups.delete(d);
      }

      // Undo root-level exclusions
      for (const d of newExclusions) excludedGroups.delete(d);
    }
  }

  backtrack(0);

  // Sort results by preferences.priorityOrder
  const order = preferences.priorityOrder || ['timeFit', 'days', 'gaps'];
  results.sort((a, b) => {
    for (const criterion of order) {
      const diff = a.scores[criterion] - b.scores[criterion];
      if (diff !== 0) return diff;
    }
    return 0;
  });

  return {
    schedules: results.slice(0, maxResults),
    totalFound: results.length,
    capped: results.length >= generationLimit,
  };
}
