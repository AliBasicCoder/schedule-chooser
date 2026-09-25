import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type {
  ClassItem,
  GeneratedSchedule,
  Preferences,
  PriorityCriterion,
  ScheduleData,
  ToastMessage,
  ToastType,
} from '../types/schedule';
import { generateSchedules } from '../utils/solver';
import { minToTime, timeToMin, SLOT_MINUTES } from '../utils/time';
import { validateScheduleJSON } from '../utils/validation';

const STORAGE_KEY_DATA = 'schedule-optimizer-data';
const STORAGE_KEY_STATE = 'schedule-optimizer-state';

export interface ScheduleContextType {
  currentScreen: 'import' | 'setup' | 'results';
  setScreen: (screen: 'import' | 'setup' | 'results') => void;
  scheduleData: ScheduleData | null;
  loadScheduleData: (data: ScheduleData) => void;
  clearScheduleData: () => void;
  crossedOff: Set<string>;
  blockedSlots: Set<string>;
  pinnedClasses: Record<string, number | null>;
  preferences: Preferences;
  groupMode: 'auto' | 'manual';
  manualGroupChoices: Record<string, { subgroupIds: string[] }>;
  generatedSchedules: GeneratedSchedule[];
  activeResultIndex: number;
  showAllResults: boolean;
  toasts: ToastMessage[];
  showToast: (text: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
  isGenerating: boolean;
  generationProgress: { found: number; checked: number } | null;
  activePickerClass: ClassItem | null;
  openSessionPicker: (cls: ClassItem) => void;
  closeSessionPicker: () => void;
  toggleBlockedSlot: (slotKey: string) => void;
  toggleEntireDay: (day: string) => void;
  isEntireDayBlocked: (day: string) => boolean;
  toggleSessionCrossOff: (classId: string, sessionIndex: number) => void;
  toggleClassCrossOff: (classId: string) => void;
  handlePinClick: (classId: string, sessionIndex?: number) => void;
  pinSession: (classId: string, sessionIndex: number) => void;
  unpinClass: (classId: string) => void;
  isSessionPinned: (classId: string, sessionIdx: number) => boolean;
  isSessionCrossedDueToPin: (classId: string, sessionIdx: number) => boolean;
  isSessionCrossed: (classId: string, sessionIdx: number) => boolean;
  isClassEntirelyCrossed: (cls: ClassItem) => boolean;
  updateTimeWindow: (start: string, end: string) => void;
  updatePriorityOrder: (order: PriorityCriterion[]) => void;
  setGroupMode: (mode: 'auto' | 'manual') => void;
  setManualGroupChoice: (parentId: string, childId: string, isRadio: boolean, checked: boolean) => void;
  setManualSubgroupChoice: (groupId: string, subgroupId: string, isRadio: boolean, checked: boolean) => void;
  resetAll: () => void;
  runScheduleGeneration: () => void;
  setActiveResultIndex: (idx: number) => void;
  setShowAllResults: (show: boolean) => void;
  pinConflicts: string[];
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<'import' | 'setup' | 'results'>('import');
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [crossedOff, setCrossedOff] = useState<Set<string>>(new Set());
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
  const [pinnedClasses, setPinnedClasses] = useState<Record<string, number | null>>({});
  const [preferences, setPreferences] = useState<Preferences>({
    timeWindow: { start: '09:00', end: '17:00' },
    priorityOrder: ['timeFit', 'days', 'gaps'],
  });
  const [groupMode, setGroupModeState] = useState<'auto' | 'manual'>('auto');
  const [manualGroupChoices, setManualGroupChoices] = useState<Record<string, { subgroupIds: string[] }>>({});
  const [generatedSchedules, setGeneratedSchedules] = useState<GeneratedSchedule[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [showAllResults, setShowAllResults] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ found: number; checked: number } | null>(null);
  const [activePickerClass, setActivePickerClass] = useState<ClassItem | null>(null);

  // Initialize from localStorage once on mount
  useEffect(() => {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY_DATA);
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        const result = validateScheduleJSON(parsed);
        if (result.valid && result.data) {
          setScheduleData(result.data);
        }
      }

      const stateStr = localStorage.getItem(STORAGE_KEY_STATE);
      if (stateStr) {
        const saved = JSON.parse(stateStr);
        if (Array.isArray(saved.crossedOff)) setCrossedOff(new Set(saved.crossedOff));
        if (Array.isArray(saved.blockedSlots)) setBlockedSlots(new Set(saved.blockedSlots));
        if (saved.pinnedClasses && typeof saved.pinnedClasses === 'object') setPinnedClasses(saved.pinnedClasses);
        if (saved.preferences) setPreferences(saved.preferences);
        if (saved.groupMode) setGroupModeState(saved.groupMode);
        if (saved.manualGroupChoices) setManualGroupChoices(saved.manualGroupChoices);
      }
    } catch (e) {
      console.error('Error loading stored schedule data', e);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      if (scheduleData) {
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(scheduleData));
      } else {
        localStorage.removeItem(STORAGE_KEY_DATA);
      }

      const persistable = {
        crossedOff: Array.from(crossedOff),
        blockedSlots: Array.from(blockedSlots),
        pinnedClasses,
        preferences,
        groupMode,
        manualGroupChoices,
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(persistable));
    } catch {
      // ignore storage errors
    }
  }, [scheduleData, crossedOff, blockedSlots, pinnedClasses, preferences, groupMode, manualGroupChoices]);

  // Toast Notification System
  const showToast = useCallback((text: string, type: ToastType = 'info', duration: number = 2800) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-3), { id, text, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load new Schedule Data
  const loadScheduleData = useCallback((data: ScheduleData) => {
    setScheduleData(data);
    setCrossedOff(new Set());
    setBlockedSlots(new Set());
    setPinnedClasses({});
    setGeneratedSchedules([]);
    setActiveResultIndex(0);
    setShowAllResults(false);
  }, []);

  const clearScheduleData = useCallback(() => {
    setScheduleData(null);
    setCrossedOff(new Set());
    setBlockedSlots(new Set());
    setPinnedClasses({});
    setGeneratedSchedules([]);
    try {
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_STATE);
    } catch {
      // ignore
    }
  }, []);

  // Helper checks
  const isSessionPinned = useCallback(
    (classId: string, sessionIdx: number): boolean => {
      const pinnedIdx = pinnedClasses[classId];
      if (pinnedIdx === undefined) return false;
      const cls = scheduleData?.classes?.find((c) => c.id === classId);
      if (cls && cls.attendAllSessions) return true;
      if (pinnedIdx === null) return true;
      return pinnedIdx === sessionIdx;
    },
    [pinnedClasses, scheduleData]
  );

  const isSessionCrossedDueToPin = useCallback(
    (classId: string, sessionIdx: number): boolean => {
      const cls = scheduleData?.classes?.find((c) => c.id === classId);
      if (cls && cls.attendAllSessions) return false;
      const pinnedIdx = pinnedClasses[classId];
      if (pinnedIdx !== undefined && pinnedIdx !== null) {
        return pinnedIdx !== sessionIdx;
      }
      return false;
    },
    [pinnedClasses, scheduleData]
  );

  const isSessionCrossed = useCallback(
    (classId: string, sessionIdx: number): boolean => {
      if (isSessionCrossedDueToPin(classId, sessionIdx)) return true;
      if (crossedOff.has(classId)) return true;
      if (crossedOff.has(`${classId}#${sessionIdx}`)) return true;
      return false;
    },
    [crossedOff, isSessionCrossedDueToPin]
  );

  const isClassEntirelyCrossed = useCallback(
    (cls: ClassItem): boolean => {
      if (!cls || !cls.sessions || cls.sessions.length === 0) return false;
      if (crossedOff.has(cls.id)) return true;
      return cls.sessions.every((_, idx) => isSessionCrossed(cls.id, idx));
    },
    [crossedOff, isSessionCrossed]
  );

  const isEntireDayBlocked = useCallback(
    (day: string): boolean => {
      if (!scheduleData) return false;
      const startMin = timeToMin(scheduleData.meta.dayStart);
      const endMin = timeToMin(scheduleData.meta.dayEnd);
      for (let t = startMin; t < endMin; t += SLOT_MINUTES) {
        if (!blockedSlots.has(`${day}-${minToTime(t)}`)) return false;
      }
      return true;
    },
    [scheduleData, blockedSlots]
  );

  // Slot blocking toggles
  const toggleBlockedSlot = useCallback((slotKey: string) => {
    setBlockedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slotKey)) {
        next.delete(slotKey);
      } else {
        next.add(slotKey);
      }
      return next;
    });
  }, []);

  const toggleEntireDay = useCallback(
    (day: string) => {
      if (!scheduleData) return;
      const startMin = timeToMin(scheduleData.meta.dayStart);
      const endMin = timeToMin(scheduleData.meta.dayEnd);
      const allBlocked = isEntireDayBlocked(day);

      setBlockedSlots((prev) => {
        const next = new Set(prev);
        for (let t = startMin; t < endMin; t += SLOT_MINUTES) {
          const key = `${day}-${minToTime(t)}`;
          if (allBlocked) {
            next.delete(key);
          } else {
            next.add(key);
          }
        }
        return next;
      });

      showToast(allBlocked ? `${day} unblocked.` : `${day} blocked.`, 'info', 1800);
    },
    [scheduleData, isEntireDayBlocked, showToast]
  );

  // Pin / Cross-off handlers
  const pinSession = useCallback(
    (classId: string, sessionIdx: number) => {
      const cls = scheduleData?.classes?.find((c) => c.id === classId);
      const name = cls?.name || 'Class';
      const session = cls?.sessions?.[sessionIdx];
      const sessionLabel = session ? ` (${session.day} ${session.start})` : '';

      // If already pinned to this session, unpin
      if (isSessionPinned(classId, sessionIdx)) {
        setPinnedClasses((prev) => {
          const next = { ...prev };
          delete next[classId];
          return next;
        });
        showToast(`"${name}" unpinned.`, 'info', 1600);
        return;
      }

      // Uncross if it was crossed
      setCrossedOff((prev) => {
        const next = new Set(prev);
        next.delete(`${classId}#${sessionIdx}`);
        next.delete(classId);
        return next;
      });

      if (cls && cls.attendAllSessions) {
        setPinnedClasses((prev) => ({ ...prev, [classId]: null }));
        showToast(`"${name}" pinned.`, 'success', 2000);
      } else {
        setPinnedClasses((prev) => ({ ...prev, [classId]: sessionIdx }));
        if (cls && cls.sessions && cls.sessions.length > 1) {
          showToast(`"${name}"${sessionLabel} pinned. Other instances crossed off.`, 'success', 2500);
        } else {
          showToast(`"${name}" pinned.`, 'success', 2000);
        }
      }
    },
    [scheduleData, isSessionPinned, showToast]
  );

  const unpinClass = useCallback(
    (classId: string) => {
      const cls = scheduleData?.classes?.find((c) => c.id === classId);
      const name = cls?.name || 'Class';
      setPinnedClasses((prev) => {
        const next = { ...prev };
        delete next[classId];
        return next;
      });
      showToast(`"${name}" unpinned.`, 'info', 1600);
    },
    [scheduleData, showToast]
  );

  const toggleSessionCrossOff = useCallback(
    (classId: string, sessionIdx: number) => {
      const cls = scheduleData?.classes?.find((c) => c.id === classId);
      const name = cls?.name || 'Class';
      const session = cls?.sessions?.[sessionIdx];
      const sessionLabel = session ? ` (${session.day} ${session.start})` : '';

      // Check if another instance is pinned
      if (isSessionCrossedDueToPin(classId, sessionIdx)) {
        showToast(`You have an instance of "${name}" pinned. Unpin it first to restore other instances.`, 'warning', 3200);
        return;
      }

      // If this session itself is pinned, unpin it first
      if (isSessionPinned(classId, sessionIdx)) {
        setPinnedClasses((prev) => {
          const next = { ...prev };
          delete next[classId];
          return next;
        });
      }

      const sessionKey = `${classId}#${sessionIdx}`;
      const isDirectlyCrossed = crossedOff.has(sessionKey);
      const isClassCrossed = crossedOff.has(classId);

      setCrossedOff((prev) => {
        const next = new Set(prev);
        if (isDirectlyCrossed || isClassCrossed) {
          next.delete(sessionKey);
          next.delete(classId);
          showToast(`"${name}"${sessionLabel} restored.`, 'info', 1800);
        } else {
          next.add(sessionKey);
          showToast(`"${name}"${sessionLabel} crossed off.`, 'info', 1800);
        }
        return next;
      });
    },
    [scheduleData, isSessionCrossedDueToPin, isSessionPinned, crossedOff, showToast]
  );

  const toggleClassCrossOff = useCallback(
    (classId: string) => {
      const cls = scheduleData?.classes?.find((c) => c.id === classId);
      const name = cls ? cls.name : 'Class';

      if (pinnedClasses[classId] !== undefined) {
        showToast(`You have an instance of "${name}" pinned. Unpin it first.`, 'warning', 3200);
        return;
      }

      const isCurrentlyCrossed = isClassEntirelyCrossed(cls!);

      setCrossedOff((prev) => {
        const next = new Set(prev);
        if (isCurrentlyCrossed) {
          next.delete(classId);
          if (cls && cls.sessions) {
            for (let i = 0; i < cls.sessions.length; i++) {
              next.delete(`${classId}#${i}`);
            }
          }
          showToast(`"${name}" restored.`, 'info', 1800);
        } else {
          next.add(classId);
          if (cls && cls.sessions) {
            for (let i = 0; i < cls.sessions.length; i++) {
              next.add(`${classId}#${i}`);
            }
          }
          showToast(`"${name}" crossed off.`, 'info', 1800);
        }
        return next;
      });
    },
    [scheduleData, pinnedClasses, isClassEntirelyCrossed, showToast]
  );

  const openSessionPicker = useCallback((cls: ClassItem) => {
    setActivePickerClass(cls);
  }, []);

  const closeSessionPicker = useCallback(() => {
    setActivePickerClass(null);
  }, []);

  const handlePinClick = useCallback(
    (classId: string, sessionIndex?: number) => {
      const cls = scheduleData?.classes?.find((c) => c.id === classId);
      if (!cls) return;

      if (pinnedClasses[classId] !== undefined) {
        unpinClass(classId);
        return;
      }

      if (cls.attendAllSessions || cls.sessions.length === 1) {
        pinSession(classId, 0);
        return;
      }

      if (sessionIndex !== undefined && !isNaN(sessionIndex)) {
        pinSession(classId, sessionIndex);
        return;
      }

      // Multi-session pick-one with no explicit session index: open picker
      openSessionPicker(cls);
    },
    [scheduleData, pinnedClasses, unpinClass, pinSession, openSessionPicker]
  );

  // Preference updates
  const updateTimeWindow = useCallback((start: string, end: string) => {
    setPreferences((prev) => ({
      ...prev,
      timeWindow: { start, end },
    }));
  }, []);

  const updatePriorityOrder = useCallback((order: PriorityCriterion[]) => {
    setPreferences((prev) => ({
      ...prev,
      priorityOrder: order,
    }));
  }, []);

  const setGroupMode = useCallback((mode: 'auto' | 'manual') => {
    setGroupModeState(mode);
  }, []);

  const setManualSubgroupChoice = useCallback(
    (groupId: string, subgroupId: string, isRadio: boolean, checked: boolean) => {
      setManualGroupChoices((prev) => {
        const next = { ...prev };
        if (!next[groupId]) {
          next[groupId] = { subgroupIds: [] };
        }
        const currentSubgroupIds = next[groupId].subgroupIds || [];

        if (isRadio) {
          next[groupId] = { subgroupIds: [subgroupId] };
        } else {
          if (checked) {
            if (!currentSubgroupIds.includes(subgroupId)) {
              next[groupId] = { subgroupIds: [...currentSubgroupIds, subgroupId] };
            }
          } else {
            next[groupId] = { subgroupIds: currentSubgroupIds.filter((id) => id !== subgroupId) };
          }
        }
        return next;
      });
    },
    []
  );

  // Real-time conflict detector for pinned classes
  const pinConflicts = useMemo(() => {
    if (!scheduleData) return [];
    const errors: string[] = [];
    const classMap: Record<string, ClassItem> = {};
    for (const c of scheduleData.classes) classMap[c.id] = c;

    // Check time overlaps between pinned classes
    const pinnedSessions: { classId: string; day: string; startMin: number; endMin: number }[] = [];
    for (const [classId, sessionIdx] of Object.entries(pinnedClasses)) {
      const cls = classMap[classId];
      if (!cls) continue;

      if (cls.attendAllSessions || sessionIdx === null) {
        for (const s of cls.sessions) {
          pinnedSessions.push({
            classId,
            day: s.day,
            startMin: timeToMin(s.start),
            endMin: timeToMin(s.end),
          });
        }
      } else {
        const s = cls.sessions[sessionIdx];
        if (s) {
          pinnedSessions.push({
            classId,
            day: s.day,
            startMin: timeToMin(s.start),
            endMin: timeToMin(s.end),
          });
        }
      }
    }

    // Pairwise overlap check
    for (let i = 0; i < pinnedSessions.length; i++) {
      for (let j = i + 1; j < pinnedSessions.length; j++) {
        const a = pinnedSessions[i];
        const b = pinnedSessions[j];
        if (a.classId === b.classId) continue;
        if (a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin) {
          const nameA = classMap[a.classId]?.name || a.classId;
          const nameB = classMap[b.classId]?.name || b.classId;
          errors.push(
            `Pinned classes overlap: "${nameA}" and "${nameB}" on ${a.day} ${minToTime(Math.max(a.startMin, b.startMin))}`
          );
        }
      }
    }

    // Check pinned sessions on blocked slots
    for (const ps of pinnedSessions) {
      for (let m = ps.startMin; m < ps.endMin; m += SLOT_MINUTES) {
        const key = `${ps.day}-${minToTime(m)}`;
        if (blockedSlots.has(key)) {
          const name = classMap[ps.classId]?.name || ps.classId;
          errors.push(`Pinned class "${name}" falls on a blocked time slot (${ps.day} ${minToTime(m)})`);
          break;
        }
      }
    }

    // Check conflicting groups among pinned classes
    const pinnedGroupIds = new Set<string>();
    for (const classId of Object.keys(pinnedClasses)) {
      const cls = classMap[classId];
      if (cls && cls.groupId) pinnedGroupIds.add(cls.groupId);
    }
    const groupMap: Record<string, any> = {};
    for (const g of scheduleData.groups) groupMap[g.id] = g;

    // Helper: get all ancestors of a group
    function getAncestorIds(gid: string): string[] {
      const ancestors: string[] = [];
      let cur = groupMap[gid];
      while (cur && cur.parentId) {
        ancestors.push(cur.parentId);
        cur = groupMap[cur.parentId];
      }
      return ancestors;
    }

    // Check explicit conflictsWith (including inherited from ancestors)
    for (const gid of pinnedGroupIds) {
      const group = groupMap[gid];
      if (!group) continue;

      // Check direct and ancestor conflictsWith
      const idsToCheck = [gid, ...getAncestorIds(gid)];
      for (const checkId of idsToCheck) {
        const g = groupMap[checkId];
        if (g && g.conflictsWith) {
          for (const conflictGid of g.conflictsWith) {
            // Check if any pinned group is this conflict target or a descendant of it
            for (const pinnedGid of pinnedGroupIds) {
              if (pinnedGid === gid) continue;
              const pinnedAncestors = [pinnedGid, ...getAncestorIds(pinnedGid)];
              if (pinnedAncestors.includes(conflictGid)) {
                errors.push(
                  `Pinned classes are in conflicting groups: "${group.name}" and "${groupMap[pinnedGid]?.name || pinnedGid}"`
                );
              }
            }
          }
        }
      }
    }

    // Check childrenConflict: if two pinned classes' groups share a parent with childrenConflict,
    // and they are in different child branches, that's a conflict
    const pinnedGroupArray = Array.from(pinnedGroupIds);
    for (let i = 0; i < pinnedGroupArray.length; i++) {
      for (let j = i + 1; j < pinnedGroupArray.length; j++) {
        const g1 = pinnedGroupArray[i];
        const g2 = pinnedGroupArray[j];
        const ancestors1 = [g1, ...getAncestorIds(g1)];
        const ancestors2 = [g2, ...getAncestorIds(g2)];

        // Find the lowest common ancestor
        for (const a1 of ancestors1) {
          if (ancestors2.includes(a1)) {
            // a1 is a common ancestor — check if it has childrenConflict
            const commonParent = groupMap[a1];
            if (commonParent && commonParent.childrenConflict) {
              // Determine which direct children of this parent each belongs to
              const directChild1 = ancestors1[ancestors1.indexOf(a1) - 1] || g1;
              const directChild2 = ancestors2[ancestors2.indexOf(a1) - 1] || g2;
              if (directChild1 !== directChild2) {
                errors.push(
                  `Pinned classes are in conflicting branches under "${commonParent.name}": "${groupMap[g1]?.name || g1}" and "${groupMap[g2]?.name || g2}"`
                );
              }
            }
            break;
          }
        }
      }
    }

    return errors;
  }, [scheduleData, pinnedClasses, blockedSlots]);

  // Reset all
  const resetAll = useCallback(() => {
    setCrossedOff(new Set());
    setBlockedSlots(new Set());
    setPinnedClasses({});
    setPreferences({
      timeWindow: { start: '09:00', end: '17:00' },
      priorityOrder: ['timeFit', 'days', 'gaps'],
    });
    setGroupModeState('auto');
    setManualGroupChoices({});
    setGeneratedSchedules([]);
    setActiveResultIndex(0);
    setShowAllResults(false);
    showToast('All settings reset.', 'info');
  }, [showToast]);

  // Solver execution
  const runScheduleGeneration = useCallback(() => {
    if (!scheduleData) return;
    if (pinConflicts.length > 0) {
      showToast('Please resolve conflicting pins before generating.', 'error', 3500);
      return;
    }

    setIsGenerating(true);
    setGenerationProgress({ found: 0, checked: 0 });

    // Filter out classes where entire class is crossed off or all sessions are crossed off
    const filteredClasses = scheduleData.classes.filter((c) => {
      if (crossedOff.has(c.id)) return false;
      if (c.attendAllSessions) {
        return !c.sessions.some((_, i) => crossedOff.has(`${c.id}#${i}`));
      } else {
        return !c.sessions.every((_, i) => crossedOff.has(`${c.id}#${i}`));
      }
    });

    const config = {
      classes: filteredClasses,
      groups: scheduleData.groups,
      blockedSlots: Array.from(blockedSlots),
      pinnedClasses,
      crossedOff: Array.from(crossedOff),
      groupMode,
      manualGroupChoices,
      preferences,
      maxResults: 500,
    };

    // Run asynchronously to allow UI to render the loading overlay
    setTimeout(() => {
      try {
        const result = generateSchedules(config, (found, checked) => {
          setGenerationProgress({ found, checked });
        });

        setIsGenerating(false);
        setGenerationProgress(null);

        if (result.error) {
          showToast(result.error, 'error', 4000);
          return;
        }

        setGeneratedSchedules(result.schedules);
        setActiveResultIndex(0);
        setShowAllResults(false);
        setCurrentScreen('results');
      } catch (err: any) {
        setIsGenerating(false);
        setGenerationProgress(null);
        showToast('Generation failed: ' + (err.message || String(err)), 'error', 5000);
      }
    }, 60);
  }, [scheduleData, pinConflicts, crossedOff, blockedSlots, pinnedClasses, groupMode, manualGroupChoices, preferences, showToast]);

  return (
    <ScheduleContext.Provider
      value={{
        currentScreen,
        setScreen: setCurrentScreen,
        scheduleData,
        loadScheduleData,
        clearScheduleData,
        crossedOff,
        blockedSlots,
        pinnedClasses,
        preferences,
        groupMode,
        manualGroupChoices,
        generatedSchedules,
        activeResultIndex,
        showAllResults,
        toasts,
        showToast,
        dismissToast,
        isGenerating,
        generationProgress,
        activePickerClass,
        openSessionPicker,
        closeSessionPicker,
        toggleBlockedSlot,
        toggleEntireDay,
        isEntireDayBlocked,
        toggleSessionCrossOff,
        toggleClassCrossOff,
        handlePinClick,
        pinSession,
        unpinClass,
        isSessionPinned,
        isSessionCrossedDueToPin,
        isSessionCrossed,
        isClassEntirelyCrossed,
        updateTimeWindow,
        updatePriorityOrder,
        setGroupMode,
        setManualGroupChoice: setManualSubgroupChoice,
        setManualSubgroupChoice,
        resetAll,
        runScheduleGeneration,
        setActiveResultIndex,
        setShowAllResults,
        pinConflicts,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
