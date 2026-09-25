import React from 'react';
import { Layers, CheckCircle2 } from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';

export function GroupsPanel() {
  const {
    scheduleData,
    groupMode,
    setGroupMode,
    manualGroupChoices,
    setManualSubgroupChoice,
  } = useSchedule();

  if (!scheduleData || scheduleData.groups.length === 0) {
    return null;
  }

  const isManual = groupMode === 'manual';

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101224]/80 p-5 shadow-xl backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#00D4AA]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Groups</h3>
        </div>

        {/* Auto / Manual Toggle Switch */}
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-300">
          <span className="text-[11px] text-slate-400">Auto-choose</span>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              checked={groupMode === 'auto'}
              onChange={(e) => setGroupMode(e.target.checked ? 'auto' : 'manual')}
              className="peer sr-only"
            />
            <div className="h-5 w-9 rounded-full bg-white/15 peer-checked:bg-[#6C63FF] peer-checked:after:translate-x-4 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all"></div>
          </div>
        </label>
      </div>

      {/* Group Cards List */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {scheduleData.groups.map((group) => {
          const groupClasses = scheduleData.classes.filter((c) => c.groupId === group.id);
          const chosenSubgroups = manualGroupChoices[group.id]?.subgroupIds || [];

          return (
            <div
              key={group.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-white leading-tight">{group.name}</span>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    group.required
                      ? 'bg-[#6C63FF]/20 text-[#8B85FF] border border-[#6C63FF]/30'
                      : 'bg-[#00D4AA]/20 text-[#00D4AA] border border-[#00D4AA]/30'
                  }`}
                >
                  {group.required ? 'Required' : 'Optional'}
                </span>
              </div>

              {/* Subgroups Selection */}
              {group.subgroups && group.subgroups.length > 0 && (
                <div className="mt-2.5 space-y-1.5 border-t border-white/5 pt-2">
                  <div className="text-[10px] font-semibold text-slate-400">Subgroups:</div>
                  {group.subgroups.map((sg) => {
                    const isRadio = sg.conflictMode === 'conflicting';
                    const isChecked = isManual && chosenSubgroups.includes(sg.id);

                    return (
                      <label
                        key={sg.id}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition ${
                          !isManual
                            ? 'cursor-not-allowed opacity-60'
                            : 'cursor-pointer hover:bg-white/5'
                        }`}
                      >
                        <input
                          type={isRadio ? 'radio' : 'checkbox'}
                          name={`group-${group.id}`}
                          value={sg.id}
                          checked={isChecked}
                          disabled={!isManual}
                          onChange={(e) =>
                            setManualSubgroupChoice(group.id, sg.id, isRadio, e.target.checked)
                          }
                          className="h-3.5 w-3.5 text-[#6C63FF] accent-[#6C63FF]"
                        />
                        <span className="text-xs font-medium text-slate-200">{sg.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Classes in Group */}
              {groupClasses.length > 0 && (
                <div className="mt-2 text-[10px] text-slate-400">
                  <span className="text-slate-500 font-semibold">Classes: </span>
                  {groupClasses
                    .map((c) => {
                      const sg = c.subgroupId
                        ? group.subgroups?.find((s) => s.id === c.subgroupId)
                        : null;
                      return `${c.name}${sg ? ` (${sg.name})` : ''}`;
                    })
                    .join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
