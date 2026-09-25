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
          desc: 'Minimize classes outside time window',
          icon: <Clock className="h-4 w-4 text-[#8B85FF]" />,
        };
      case 'days':
        return {
          label: 'Fewer Days',
          desc: 'Minimize days on campus',
          icon: <Calendar className="h-4 w-4 text-[#00D4AA]" />,
        };
      case 'gaps':
        return {
          label: 'Fewer Gaps',
          desc: 'Minimize idle gap time between classes',
          icon: <Hourglass className="h-4 w-4 text-[#FFB020]" />,
        };
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101224]/80 p-5 shadow-xl backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Sliders className="h-4 w-4 text-[#6C63FF]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Preferences</h3>
      </div>

      {/* Preferred Time Window */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-semibold text-slate-300">
          Preferred Time Window
        </label>
        <div className="flex items-center gap-2">
          <input
            type="time"
            step={900}
            value={preferences.timeWindow.start}
            onChange={(e) => updateTimeWindow(e.target.value, preferences.timeWindow.end)}
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-semibold text-white focus:border-[#6C63FF] focus:outline-none"
          />
          <span className="text-xs text-slate-500 font-bold">→</span>
          <input
            type="time"
            step={900}
            value={preferences.timeWindow.end}
            onChange={(e) => updateTimeWindow(preferences.timeWindow.start, e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-semibold text-white focus:border-[#6C63FF] focus:outline-none"
          />
        </div>
      </div>

      {/* Ranking Priority */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">Ranking Priority</label>
          <span className="text-[10px] text-slate-500">Order of solver importance</span>
        </div>

        <div className="space-y-2">
          {preferences.priorityOrder.map((criterion, idx) => {
            const info = getCriterionInfo(criterion);
            return (
              <div
                key={criterion}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-2.5 transition hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                    {info.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      <span className="mr-1 text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                      {info.label}
                    </div>
                    <div className="text-[10px] text-slate-400">{info.desc}</div>
                  </div>
                </div>

                {/* Arrow order controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition"
                    title="Move up in priority"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === preferences.priorityOrder.length - 1}
                    className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition"
                    title="Move down in priority"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
