import React, { useMemo } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import type { ChipLayoutItem, ScheduleData, ScheduleSelection } from '../../types/schedule';
import {
  assignTracks,
  minToTime,
  timeToMin,
  SLOT_MINUTES,
  SLOT_WIDTH_PX,
  TRACK_HEIGHT,
} from '../../utils/time';
import { SessionChip } from './SessionChip';

interface ScheduleGridProps {
  data: ScheduleData;
  interactive?: boolean;
  selections?: ScheduleSelection[];
}

export function ScheduleGrid({ data, interactive = true, selections }: ScheduleGridProps) {
  const { blockedSlots, toggleBlockedSlot, toggleEntireDay, isEntireDayBlocked } = useSchedule();

  const meta = data.meta;
  const days = meta.dayOrder;
  const startMin = timeToMin(meta.dayStart);
  const endMin = timeToMin(meta.dayEnd);
  const numSlots = Math.round((endMin - startMin) / SLOT_MINUTES);

  // Pre-calculate chips for each day
  const chipsByDay = useMemo(() => {
    const classMap = new Map(data.classes.map((c) => [c.id, c]));
    const result: Record<string, ChipLayoutItem[]> = {};

    for (const day of days) {
      const dayChips: ChipLayoutItem[] = [];

      if (!selections) {
        // Setup view: show all sessions for all classes
        for (const cls of data.classes) {
          for (let si = 0; si < cls.sessions.length; si++) {
            const session = cls.sessions[si];
            if (session.day !== day) continue;
            const sessStartMin = timeToMin(session.start);
            const sessEndMin = timeToMin(session.end);
            const left = ((sessStartMin - startMin) / SLOT_MINUTES) * SLOT_WIDTH_PX;
            const width = ((sessEndMin - sessStartMin) / SLOT_MINUTES) * SLOT_WIDTH_PX;

            dayChips.push({
              classObj: cls,
              sessionIndex: si,
              session,
              left,
              width,
              track: 0,
              startMin: sessStartMin,
              endMin: sessEndMin,
            });
          }
        }
      } else {
        // Results view: only show selected sessions for selected classes
        for (const sel of selections) {
          const cls = classMap.get(sel.classId);
          if (!cls) continue;
          for (const si of sel.sessionIndices) {
            const session = cls.sessions[si];
            if (!session || session.day !== day) continue;
            const sessStartMin = timeToMin(session.start);
            const sessEndMin = timeToMin(session.end);
            const left = ((sessStartMin - startMin) / SLOT_MINUTES) * SLOT_WIDTH_PX;
            const width = ((sessEndMin - sessStartMin) / SLOT_MINUTES) * SLOT_WIDTH_PX;

            dayChips.push({
              classObj: cls,
              sessionIndex: si,
              session,
              left,
              width,
              track: 0,
              startMin: sessStartMin,
              endMin: sessEndMin,
            });
          }
        }
      }

      assignTracks(dayChips);
      result[day] = dayChips;
    }

    return result;
  }, [data, days, selections, startMin]);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-[#0b0d1a]/90 shadow-2xl backdrop-blur-xl">
      <div className="min-w-max select-none">
        {/* Sticky Header Row: Corner + Time Labels */}
        <div className="sticky top-0 z-20 flex border-b border-white/10 bg-[#0b0d1a]/95 backdrop-blur-md">
          {/* Corner cell */}
          <div className="w-20 shrink-0 border-r border-white/10 p-2 text-center text-[11px] font-bold text-slate-500">
            TIME
          </div>

          {/* Time Labels */}
          {Array.from({ length: numSlots }).map((_, i) => {
            const t = startMin + i * SLOT_MINUTES;
            const isHour = t % 60 === 0;
            const isHalfHour = t % 30 === 0;

            return (
              <div
                key={i}
                style={{ width: `${SLOT_WIDTH_PX}px` }}
                className={`shrink-0 py-2.5 text-center text-[10px] select-none ${
                  isHour
                    ? 'border-l-2 border-white/20 font-bold text-slate-200'
                    : isHalfHour
                    ? 'border-l border-dashed border-white/15 text-slate-500'
                    : 'border-l border-white/5 text-transparent'
                }`}
              >
                {isHour ? minToTime(t) : ''}
              </div>
            );
          })}
        </div>

        {/* Day Rows */}
        {days.map((day) => {
          const dayChips = chipsByDay[day] || [];
          const maxTrack = dayChips.reduce((max, c) => Math.max(max, c.track), 0);
          const trackCount = dayChips.length > 0 ? maxTrack + 1 : 1;
          const rowHeight = Math.max(76, trackCount * TRACK_HEIGHT + 8);
          const dayAllBlocked = interactive && isEntireDayBlocked(day);

          return (
            <div key={day} className="flex border-b border-white/10 last:border-b-0">
              {/* Day Header Label */}
              <div
                onClick={() => {
                  if (interactive) toggleEntireDay(day);
                }}
                style={{ height: `${rowHeight}px` }}
                className={`group relative flex w-20 shrink-0 flex-col items-center justify-center border-r border-white/10 font-bold text-xs transition ${
                  interactive ? 'cursor-pointer hover:bg-red-500/15 hover:text-red-400' : 'cursor-default'
                } ${dayAllBlocked ? 'bg-red-500/20 text-red-400' : 'bg-black/25 text-slate-300'}`}
                title={interactive ? `Click to toggle all slots for ${day}` : day}
              >
                <span>{day}</span>
                {interactive && (
                  <span className="text-[9px] font-normal text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {dayAllBlocked ? 'unblock' : 'block'}
                  </span>
                )}
              </div>

              {/* Day Slots Container (Slots grid + Overlay Chips) */}
              <div className="relative flex flex-1" style={{ height: `${rowHeight}px` }}>
                {/* 15-Minute Slot Cells */}
                {Array.from({ length: numSlots }).map((_, i) => {
                  const t = startMin + i * SLOT_MINUTES;
                  const slotKey = `${day}-${minToTime(t)}`;
                  const isHour = t % 60 === 0;
                  const isHalfHour = t % 30 === 0;
                  const isBlocked = blockedSlots.has(slotKey);

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (interactive) toggleBlockedSlot(slotKey);
                      }}
                      style={{ width: `${SLOT_WIDTH_PX}px` }}
                      title={
                        interactive
                          ? `${day} ${minToTime(t)}–${minToTime(t + SLOT_MINUTES)}${
                              isBlocked ? ' (Blocked - click to unblock)' : ' (Click to block)'
                            }`
                          : undefined
                      }
                      className={`h-full shrink-0 border-l transition-colors ${
                        isHour
                          ? 'border-white/20'
                          : isHalfHour
                          ? 'border-dashed border-white/15'
                          : 'border-white/5'
                      } ${
                        isBlocked
                          ? 'blocked-stripes border-red-500/30'
                          : interactive
                          ? 'hover:bg-white/[0.04] cursor-pointer'
                          : ''
                      }`}
                    />
                  );
                })}

                {/* Chips Overlaid on Day Row */}
                <div className="pointer-events-none absolute inset-0">
                  {dayChips.map((chip, idx) => (
                    <SessionChip key={idx} chip={chip} interactive={interactive} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
