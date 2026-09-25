import React from 'react';
import { BookOpen, Pin, X } from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import type { ClassItem } from '../../types/schedule';

export function ClassesListPanel() {
  const {
    scheduleData,
    isClassEntirelyCrossed,
    toggleClassCrossOff,
    pinnedClasses,
    handlePinClick,
    isSessionCrossed,
  } = useSchedule();

  if (!scheduleData) return null;

  const getTypeDotColor = (type?: string) => {
    switch (type) {
      case 'lecture':
        return 'bg-[#6C63FF]';
      case 'lab':
        return 'bg-[#00D4AA]';
      case 'tutorial':
        return 'bg-[#FFB020]';
      default:
        return 'bg-[#FF6B9D]';
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101224]/80 p-5 shadow-xl backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#FFB020]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            All Classes ({scheduleData.classes.length})
          </h3>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
        {scheduleData.classes.map((cls) => {
          const isCrossed = isClassEntirelyCrossed(cls);
          const isPinned = pinnedClasses[cls.id] !== undefined;
          const group = cls.groupId
            ? scheduleData.groups.find((g) => g.id === cls.groupId)
            : null;
          const subgroup =
            group && cls.subgroupId
              ? group.subgroups?.find((s) => s.id === cls.subgroupId)
              : null;

          // Compute availability metadata
          let metaInfo = `${cls.credits || 0} cr`;
          if (!cls.attendAllSessions && cls.sessions.length > 1) {
            if (isPinned) {
              const pIdx = pinnedClasses[cls.id];
              metaInfo += ` • Sec ${pIdx !== null ? pIdx + 1 : 1} pinned`;
            } else {
              const crossedCount = cls.sessions.filter((_, i) =>
                isSessionCrossed(cls.id, i)
              ).length;
              if (crossedCount > 0 && crossedCount < cls.sessions.length) {
                metaInfo += ` • ${cls.sessions.length - crossedCount}/${cls.sessions.length} avail`;
              }
            }
          }

          return (
            <div
              key={cls.id}
              onClick={() => toggleClassCrossOff(cls.id)}
              className={`group flex items-start gap-2.5 rounded-xl border p-2.5 transition cursor-pointer ${
                isCrossed
                  ? 'border-transparent bg-white/[0.01] opacity-40 line-through'
                  : isPinned
                  ? 'border-amber-400/40 bg-amber-400/5 hover:border-amber-400/60'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
              }`}
            >
              {/* Type dot */}
              <div
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${getTypeDotColor(cls.type)}`}
              />

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-white break-words leading-snug">
                    {cls.name}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 shrink-0 font-mono mt-0.5">
                    {metaInfo}
                  </span>
                </div>

                {/* Group / Subgroup tags */}
                {(group || subgroup) && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {group && (
                      <span className="rounded bg-[#6C63FF]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#8B85FF] border border-[#6C63FF]/20">
                        {group.name}
                      </span>
                    )}
                    {subgroup && (
                      <span className="rounded bg-[#00D4AA]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#00D4AA] border border-[#00D4AA]/20">
                        {subgroup.name}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 shrink-0"
              >
                <button
                  onClick={() => toggleClassCrossOff(cls.id)}
                  title={isCrossed ? 'Restore class' : 'Cross off class'}
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                    isCrossed
                      ? 'border-red-500 bg-red-500 text-white'
                      : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <X className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handlePinClick(cls.id)}
                  title={isPinned ? 'Unpin class' : 'Pin class'}
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                    isPinned
                      ? 'border-amber-400 bg-amber-400/20 text-amber-400'
                      : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <Pin className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
