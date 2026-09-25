import React from 'react';
import { Sliders, Clock, Calendar, Hourglass, ArrowUp, ArrowDown } from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import type { PriorityCriterion } from '../../types/schedule';

export function PreferencesPanel() {
  const { preferences, updateTimeWindow, updatePriorityOrder } = useSchedule();

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...preferences.priorityOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    updatePriorityOrder(newOrder);
  };

  const getCriterionInfo = (criterion: PriorityCriterion) => {
    switch (criterion) {
      case 'timeFit':
        return {
          label: 'Preferred Time',
          desc: 'Avoid arriving before your arrival time or staying past your departure time',
          icon: <Clock className="h-4 w-4 text-[#8B85FF]" />,
        };
      case 'days':
        return {
          label: 'Fewer Days',
          desc: 'Minimize the number of days you need to be on campus',
          icon: <Calendar className="h-4 w-4 text-[#00D4AA]" />,
        };
      case 'gaps':
        return {
          label: 'Fewer Gaps',
          desc: 'Minimize idle break time between classes on the same day',
          icon: <Hourglass className="h-4 w-4 text-[#FFB020]" />,
        };
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101224]/80 p-5 sm:p-6 shadow-xl backdrop-blur-xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6C63FF]/20 text-[#8B85FF]">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Optimizer Preferences
            </h3>
            <p className="text-[11px] text-slate-400">
              Set your target time window and priority order to guide ranking
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Preferred Time Window */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-white">Preferred Daily Time Window</label>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Penalizes days when your first class starts before your preferred arrival, or your last class ends after your preferred departure.
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <div className="flex-1">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Earliest Arrival
              </span>
              <input
                type="time"
                step={900}
                value={preferences.timeWindow.start}
                onChange={(e) => updateTimeWindow(e.target.value, preferences.timeWindow.end)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#6C63FF] focus:outline-none transition"
              />
            </div>
            <span className="text-xs text-slate-500 font-bold self-end pb-3">→</span>
            <div className="flex-1">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Latest Departure
              </span>
              <input
                type="time"
                step={900}
                value={preferences.timeWindow.end}
                onChange={(e) => updateTimeWindow(preferences.timeWindow.start, e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#6C63FF] focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Ranking Priority */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-white">Ranking Priority Order</label>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Top criterion is optimized first; ties are broken by subsequent criteria.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {preferences.priorityOrder.map((criterion, idx) => {
              const info = getCriterionInfo(criterion);
              return (
                <div
                  key={criterion}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-2.5 transition hover:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                      {info.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        <span className="mr-1.5 text-[10px] text-[#6C63FF] font-mono font-bold">
                          #{idx + 1}
                        </span>
                        {info.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{info.desc}</div>
                    </div>
                  </div>

                  {/* Up / Down Controls */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                      title="Move up in priority"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === preferences.priorityOrder.length - 1}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                      title="Move down in priority"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
