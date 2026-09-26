import React, { useState } from 'react';
import { Pin, X, Clock, MapPin, User } from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';

export function SessionPickerModal() {
  const { activePickerClass, closeSessionPicker, pinSession, scheduleData, courseById } = useSchedule();
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  if (!activePickerClass) return null;

  const course = activePickerClass.courseId ? courseById.get(activePickerClass.courseId) : null;

  const group = activePickerClass.groupId
    ? scheduleData?.groups.find((g) => g.id === activePickerClass.groupId)
    : null;

  // Build group ancestry chain for display
  const groupAncestry: string[] = [];
  if (group && scheduleData) {
    let curr: typeof group | undefined = group;
    while (curr) {
      groupAncestry.unshift(curr.name);
      curr = curr.parentId
        ? scheduleData.groups.find((g) => g.id === curr!.parentId)
        : undefined;
    }
  }

  const handleConfirm = () => {
    pinSession(activePickerClass.id, selectedIdx);
    closeSessionPicker();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#101224] p-6 shadow-2xl animate-modal">
        {/* Close Button */}
        <button
          onClick={closeSessionPicker}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Title & Subtitle */}
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Pin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Choose Session to Pin</h3>
            <div className="mt-0.5 text-xs text-slate-400">
              {course && (
                <div className="font-semibold text-white">
                  {course.name}
                  {course.code && <span className="ml-1.5 text-[#00D4AA] font-mono">({course.code})</span>}
                </div>
              )}
              <span className="text-slate-300 font-medium">{activePickerClass.name}</span>
              {groupAncestry.length > 0 && (
                <span className="text-slate-400"> ({groupAncestry.join(' • ')})</span>
              )}
            </div>
          </div>
        </div>

        {/* Radio Options */}
        <div className="mb-6 space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {activePickerClass.sessions.map((s, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <label
                key={idx}
                onClick={() => setSelectedIdx(idx)}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition ${
                  isSelected
                    ? 'border-[#6C63FF] bg-[#6C63FF]/15 text-white shadow-md shadow-[#6C63FF]/10'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="sessionChoice"
                    checked={isSelected}
                    onChange={() => setSelectedIdx(idx)}
                    className="h-4 w-4 text-[#6C63FF] accent-[#6C63FF]"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-white">
                        {s.day}
                      </span>
                      <span>
                        {s.start} – {s.end}
                      </span>
                    </div>
                    {(activePickerClass.location || activePickerClass.instructor) && (
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                        {activePickerClass.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {activePickerClass.location}
                          </span>
                        )}
                        {activePickerClass.instructor && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {activePickerClass.instructor}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  Option {idx + 1}
                </span>
              </label>
            );
          })}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={closeSessionPicker}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-[#6C63FF]/30 hover:opacity-95 active:scale-95 transition"
          >
            <Pin className="h-3.5 w-3.5" />
            Pin This Session
          </button>
        </div>
      </div>
    </div>
  );
}
