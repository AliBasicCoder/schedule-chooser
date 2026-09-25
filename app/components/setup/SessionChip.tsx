import React from 'react';
import { Pin, X } from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import type { ChipLayoutItem } from '../../types/schedule';

interface SessionChipProps {
  chip: ChipLayoutItem;
  interactive?: boolean;
}

export function SessionChip({ chip, interactive = true }: SessionChipProps) {
  const {
    scheduleData,
    isSessionPinned,
    isSessionCrossedDueToPin,
    isSessionCrossed,
    toggleSessionCrossOff,
    handlePinClick,
  } = useSchedule();

  const { classObj, sessionIndex, session, left, width, track } = chip;
  const isPinned = isSessionPinned(classObj.id, sessionIndex);
  const isCrossedDueToPin = isSessionCrossedDueToPin(classObj.id, sessionIndex);
  const isCrossed = isSessionCrossed(classObj.id, sessionIndex);

  // Group and Subgroup names
  const group = classObj.groupId ? scheduleData?.groups.find((g) => g.id === classObj.groupId) : null;
  const subgroup =
    group && classObj.subgroupId
      ? group.subgroups?.find((sg) => sg.id === classObj.subgroupId)
      : null;

  // Type gradient styling
  const getTypeStyle = (type?: string) => {
    switch (type) {
      case 'lecture':
        return 'from-[#6C63FF] to-[#8B5CF6] text-white border-[#6C63FF]/30';
      case 'lab':
        return 'from-[#00D4AA] to-[#00B894] text-slate-950 font-bold border-[#00D4AA]/30';
      case 'tutorial':
        return 'from-[#FFB020] to-[#E69614] text-slate-950 font-bold border-[#FFB020]/30';
      default:
        return 'from-[#FF6B9D] to-[#DC5082] text-white border-[#FF6B9D]/30';
    }
  };

  const TRACK_HEIGHT = 56;
  const top = track * TRACK_HEIGHT + 4;

  // Tooltip content
  const tooltipLines = [
    classObj.name,
    group || subgroup ? `Group: ${[group?.name, subgroup?.name].filter(Boolean).join(' • ')}` : '',
    classObj.instructor ? `Instructor: ${classObj.instructor}` : '',
    classObj.location ? `Location: ${classObj.location}` : '',
    `Time: ${session.day} ${session.start}–${session.end}`,
  ]
    .filter(Boolean)
    .join('\n');

  const handleChipClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    // If chip is crossed off, clicking anywhere restores it
    if (isCrossed) {
      e.stopPropagation();
      toggleSessionCrossOff(classObj.id, sessionIndex);
    }
  };

  return (
    <div
      onClick={handleChipClick}
      title={tooltipLines}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        top: `${top}px`,
      }}
      className={`group absolute z-10 pointer-events-auto flex flex-col justify-between h-auto min-h-[38px] overflow-hidden rounded-lg p-1.5 text-xs font-semibold shadow-md transition-all select-none border ${
        interactive ? 'cursor-pointer hover:z-20 hover:scale-[1.01]' : 'cursor-default'
      } ${
        isCrossed
          ? 'border-dashed border-white/25 bg-[#232637]/80 text-slate-400 grayscale opacity-45 line-through hover:opacity-75'
          : `bg-gradient-to-r ${getTypeStyle(classObj.type)}`
      } ${
        isPinned
          ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-[#07080f] shadow-lg shadow-amber-400/20'
          : ''
      } ${isCrossedDueToPin ? 'border-amber-400/40 border-dotted' : ''}`}
    >
      {/* Title & Actions row */}
      <div className="flex items-start justify-between gap-1 min-w-0">
        <div className="flex items-start gap-1 min-w-0 flex-1">
          {isPinned && <span className="text-[10px] shrink-0 mt-0.5">📌</span>}
          <span className="text-[10.5px] font-bold leading-[13px] break-words text-left">
            {classObj.name}
          </span>
        </div>

        {/* Action Buttons (Pin & Cross) */}
        {interactive && (
          <div
            className={`flex items-center gap-0.5 shrink-0 pointer-events-auto transition-opacity ${
              isCrossed || isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {/* Cross Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSessionCrossOff(classObj.id, sessionIndex);
              }}
              title={
                isCrossedDueToPin
                  ? 'Crossed off (another instance is pinned)'
                  : isCrossed
                  ? 'Un-cross instance'
                  : 'Cross off instance'
              }
              className={`flex h-4 w-4 pointer-events-auto cursor-pointer items-center justify-center rounded transition ${
                isCrossed
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-black/50 text-white hover:bg-black/75'
              }`}
            >
              <X className="h-2.5 w-2.5" />
            </button>

            {/* Pin Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePinClick(classObj.id, sessionIndex);
              }}
              title={isPinned ? 'Unpin' : 'Pin this session'}
              className={`flex h-4 w-4 pointer-events-auto cursor-pointer items-center justify-center rounded transition ${
                isPinned
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-black/50 text-white hover:bg-black/75'
              }`}
            >
              <Pin className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* Badges / Subgroup & Info Row */}
      <div className="flex items-center gap-1 overflow-hidden leading-none">
        {/* Subgroup / Group Badge */}
        {subgroup && width > 60 && (
          <span className="shrink-0 rounded bg-black/40 px-1 py-0.5 text-[8.5px] font-bold text-white border border-white/20">
            {subgroup.name}
          </span>
        )}
        {!subgroup && group && width > 80 && (
          <span className="shrink-0 rounded bg-black/30 px-1 py-0.5 text-[8.5px] font-medium text-white/90">
            {group.name}
          </span>
        )}

        {/* Multi-session fraction badge (e.g., "1/2") */}
        {!classObj.attendAllSessions && classObj.sessions.length > 1 && width > 50 && (
          <span className="shrink-0 rounded bg-black/35 px-1 py-0.5 text-[8.5px] font-bold text-white">
            {sessionIndex + 1}/{classObj.sessions.length}
          </span>
        )}

        {/* Non-interactive results instructor / room info */}
        {!interactive && (classObj.instructor || classObj.location) && width > 110 && (
          <span className="shrink-0 truncate text-[9px] opacity-85 font-medium">
            {[classObj.location, classObj.instructor].filter(Boolean).join(' • ')}
          </span>
        )}
      </div>
    </div>
  );
}
