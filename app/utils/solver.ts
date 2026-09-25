import type {
  ClassItem,
  Group,
  Preferences,
  ScheduleScores,
  ScheduleSelection,
  GeneratedSchedule,
  SolverConfig,
  SolverResult,
  Subgroup,
} from '../types/schedule';
import { hasBlocked, hasOverlap, minToTime, sessionToSlotKeys, timeToMin } from './time';

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
    const earliestStart = Math.min(...daySessions.map((s) => s.startMin));
    const latestEnd = Math.max(...daySessions.map((s) => s.endMin));

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

/** Check whether a subset of subgroups is mutually conflict-free */
function isConflictFree(subgroups: Subgroup[]): boolean {
  for (let i = 0; i < subgroups.length; i++) {
    for (let j = i + 1; j < subgroups.length; j++) {
      const cwI = subgroups[i].conflictsWith || [];
      const cwJ = subgroups[j].conflictsWith || [];
      if (cwI.includes(subgroups[j].id) || cwJ.includes(subgroups[i].id)) {
        return false;
      }
    }
  }
  return true;
}

/** Power set helper */
function powerSet<T>(arr: T[]): T[][] {
  const result: T[][] = [[]];
  for (const item of arr) {
    const len = result.length;
    for (let i = 0; i < len; i++) {
      result.push([...result[i], item]);
    }
  }
  return result;
}

/** Enumerate all maximal independent sets for conflicting subgroups */
function enumerateIndependentSets(subgroups: Subgroup[]): string[][] {
  if (subgroups.length === 0) return [];
  const results: string[][] = [];
  const n = subgroups.length;

  for (let mask = 1; mask < (1 << n); mask++) {
    const subset: Subgroup[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(subgroups[i]);
    }
    if (isConflictFree(subset)) {
      results.push(subset.map((s) => s.id));
    }
  }
  return results;
}

/**
 * Get all valid subgroup combinations for a group.
 */
export function getSubgroupCombinations(group: Group): string[][] {
  const subgroups = group.subgroups || [];
  if (subgroups.length === 0) return [[]];

  const conflicting = subgroups.filter((s) => s.conflictMode === 'conflicting');
  const nonConflicting = subgroups.filter((s) => s.conflictMode !== 'conflicting');

  const conflictingCombos = enumerateIndependentSets(conflicting);
  const ncIds = nonConflicting.map((s) => s.id);
  const ncCombos = powerSet(ncIds);

  const result: string[][] = [];
  const ccList = conflictingCombos.length > 0 ? conflictingCombos : [[]];

  for (const cc of ccList) {
    for (const nc of ncCombos) {
      result.push([...cc, ...nc]);
    }
  }

  return result;
}

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
  const groupedClasses = classes.filter((c) => c.groupId !== null && c.groupId !== undefined);

  const classesByGroupSub: Record<string, ClassItem[]> = {};
  const classesByGroup: Record<string, ClassItem[]> = {};

  for (const c of groupedClasses) {
    const key = `${c.groupId}|${c.subgroupId || ''}`;
    if (!classesByGroupSub[key]) classesByGroupSub[key] = [];
    classesByGroupSub[key].push(c);

    const gKey = c.groupId as string;
    if (!classesByGroup[gKey]) classesByGroup[gKey] = [];
    classesByGroup[gKey].push(c);
  }

  const decisions: Decision[] = [];
  for (const c of standaloneClasses) {
    decisions.push({ type: 'standalone', classObj: c });
  }

  const reqGroups = groups.filter((g) => g.required);
  const optGroups = groups.filter((g) => !g.required);
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
    const pinnedSessionIdx = pinnedClasses[cls.id];

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
      for (let i = 0; i < cls.sessions.length; i++) {
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
    if (results.length >= maxResults) return;

    tryAddClass(clsList[idx], () => {
      processGroupClasses(clsList, idx + 1, afterDone);
    });
  }

  function backtrack(decIdx: number): void {
    if (results.length >= maxResults) return;

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
      tryAddClass(dec.classObj, () => backtrack(decIdx + 1));
    } else if (dec.type === 'group') {
      const group = dec.group;

      if (excludedGroups.has(group.id)) {
        if (group.required) return;
        backtrack(decIdx + 1);
        return;
      }

      const allGroupClasses = classesByGroup[group.id] || [];
      if (allGroupClasses.length === 0) {
        if (group.required) return;
        backtrack(decIdx + 1);
        return;
      }

      // If optional, we can consider skipping if no class in this group is pinned
      if (!group.required) {
        const hasPinnedInGroup = allGroupClasses.some((c) => pinnedSet.has(c.id));
        if (!hasPinnedInGroup) {
          backtrack(decIdx + 1);
        }
      }

      // Determine subgroup combinations
      let subCombos: string[][];
      if (groupMode === 'manual' && manualGroupChoices && manualGroupChoices[group.id]) {
        subCombos = [manualGroupChoices[group.id].subgroupIds || []];
      } else {
        subCombos = getSubgroupCombinations(group);
      }

      const newExclusions = (group.conflictsWith || []).filter((gid) => !excludedGroups.has(gid));
      for (const gid of newExclusions) excludedGroups.add(gid);

      for (const combo of subCombos) {
        if (results.length >= maxResults) break;

        const selectedClasses: ClassItem[] = [];
        const directKey = `${group.id}|`;
        if (classesByGroupSub[directKey]) {
          selectedClasses.push(...classesByGroupSub[directKey]);
        }
        for (const sgId of combo) {
          const key = `${group.id}|${sgId}`;
          if (classesByGroupSub[key]) {
            selectedClasses.push(...classesByGroupSub[key]);
          }
        }

        if (selectedClasses.length === 0 && group.required) continue;

        let pinConflict = false;
        for (const c of allGroupClasses) {
          if (pinnedSet.has(c.id) && c.subgroupId && !combo.includes(c.subgroupId)) {
            pinConflict = true;
            break;
          }
        }
        if (pinConflict) continue;

        processGroupClasses(selectedClasses, 0, () => {
          backtrack(decIdx + 1);
        });
      }

      for (const gid of newExclusions) excludedGroups.delete(gid);
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
    capped: results.length >= maxResults,
  };
}
