import React from 'react';
import { Layers, GitFork, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import type { Group, ClassItem } from '../../types/schedule';

interface GroupTreeNodeProps {
  group: Group;
  parent?: Group;
  depth: number;
  isManual: boolean;
  manualGroupChoices: Record<string, { groupIds?: string[]; subgroupIds?: string[] }>;
  onChoiceChange: (parentId: string, childId: string, isRadio: boolean, checked: boolean) => void;
  classesByGroupId: Map<string, ClassItem[]>;
  childrenByParentId: Map<string, Group[]>;
}

function GroupTreeNode({
  group,
  parent,
  depth,
  isManual,
  manualGroupChoices,
  onChoiceChange,
  classesByGroupId,
  childrenByParentId,
}: GroupTreeNodeProps) {
  const children = childrenByParentId.get(group.id) || [];
  const directClasses = classesByGroupId.get(group.id) || [];

  // If this is a child node under a parent, it can be selected via radio or checkbox
  const isChild = !!parent;
  const isRadio = !!parent?.childrenConflict;

  const parentChoices = parent ? manualGroupChoices[parent.id] : undefined;
  const chosenList = parentChoices?.groupIds || parentChoices?.subgroupIds || [];
  const isSelected = isChild && isManual && chosenList.includes(group.id);

  return (
    <div className={`transition-all ${depth > 0 ? 'mt-2' : ''}`}>
      <div
        className={`group/node flex flex-col rounded-xl transition ${
          depth === 0
            ? 'p-0'
            : 'border border-white/5 bg-white/[0.015] p-2.5 hover:border-white/15 hover:bg-white/[0.03]'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isChild && (
              <input
                type={isRadio ? 'radio' : 'checkbox'}
                name={`group-children-${parent.id}`}
                value={group.id}
                checked={isSelected}
                disabled={!isManual}
                onChange={(e) =>
                  onChoiceChange(parent.id, group.id, isRadio, e.target.checked)
                }
                className={`h-3.5 w-3.5 rounded transition ${
                  isRadio ? 'accent-[#6C63FF]' : 'accent-[#00D4AA]'
                } ${!isManual ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
              />
            )}

            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`truncate font-semibold ${
                  depth === 0
                    ? 'text-xs text-white'
                    : depth === 1
                    ? 'text-[11.5px] text-slate-200'
                    : 'text-[11px] text-slate-300'
                }`}
              >
                {group.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Required / Optional badge */}
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                group.required
                  ? 'bg-[#6C63FF]/20 text-[#8B85FF] border border-[#6C63FF]/30'
                  : 'bg-[#00D4AA]/15 text-[#00D4AA] border border-[#00D4AA]/30'
              }`}
            >
              {group.required ? 'Req' : 'Opt'}
            </span>

            {/* Mutually exclusive child indicator on parent */}
            {children.length > 0 && group.childrenConflict && (
              <span
                title="Children are mutually exclusive (pick 1)"
                className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[8.5px] font-bold text-amber-300"
              >
                Pick 1
              </span>
            )}
          </div>
        </div>

        {/* Classes directly under this group */}
        {directClasses.length > 0 && (
          <div className="mt-1.5 text-[10px] text-slate-400 pl-0.5">
            <span className="text-slate-500 font-medium">Classes: </span>
            <span className="text-slate-300 font-medium">
              {directClasses.map((c) => c.name).join(', ')}
            </span>
          </div>
        )}

        {/* Recursive Child Groups (Indented Subtree) */}
        {children.length > 0 && (
          <div className="mt-2 pl-3 ml-1.5 border-l border-white/10 space-y-1.5">
            {children.map((child) => (
              <GroupTreeNode
                key={child.id}
                group={child}
                parent={group}
                depth={depth + 1}
                isManual={isManual}
                manualGroupChoices={manualGroupChoices}
                onChoiceChange={onChoiceChange}
                classesByGroupId={classesByGroupId}
                childrenByParentId={childrenByParentId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function GroupsPanel() {
  const {
    scheduleData,
    groupMode,
    setGroupMode,
    manualGroupChoices,
    setManualGroupChoice,
  } = useSchedule();

  if (!scheduleData || scheduleData.groups.length === 0) {
    return null;
  }

  const isManual = groupMode === 'manual';

  // Build group lookup maps
  const groupMap = new Map(scheduleData.groups.map((g) => [g.id, g]));

  const childrenByParentId = new Map<string, Group[]>();
  for (const g of scheduleData.groups) {
    if (g.parentId) {
      const arr = childrenByParentId.get(g.parentId) || [];
      arr.push(g);
      childrenByParentId.set(g.parentId, arr);
    }
  }

  const classesByGroupId = new Map<string, ClassItem[]>();
  for (const c of scheduleData.classes) {
    if (c.groupId) {
      const arr = classesByGroupId.get(c.groupId) || [];
      arr.push(c);
      classesByGroupId.set(c.groupId, arr);
    }
  }

  // Root groups: groups without parent or whose parent is not in groups list
  const rootGroups = scheduleData.groups.filter(
    (g) => !g.parentId || !groupMap.has(g.parentId)
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101224]/80 p-5 shadow-xl backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#00D4AA]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Groups Tree
          </h3>
        </div>

        {/* Auto / Manual Toggle Switch */}
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-300">
          <span className="text-[11px] text-slate-400">
            {isManual ? 'Manual choices' : 'Auto-choose'}
          </span>
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

      {isManual && (
        <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-[11px] text-amber-300/90">
          Manual mode enabled: pick your preferred section for each group below.
        </div>
      )}

      {/* Root Group Cards */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {rootGroups.map((group) => (
          <div
            key={group.id}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition hover:border-white/20"
          >
            <GroupTreeNode
              group={group}
              depth={0}
              isManual={isManual}
              manualGroupChoices={manualGroupChoices}
              onChoiceChange={setManualGroupChoice}
              classesByGroupId={classesByGroupId}
              childrenByParentId={childrenByParentId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
