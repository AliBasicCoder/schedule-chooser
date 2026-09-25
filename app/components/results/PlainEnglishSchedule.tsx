import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  User,
  Coffee,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import type { GeneratedSchedule, ScheduleData } from '../../types/schedule';
import { timeToMin, minToTime } from '../../utils/time';

interface PlainEnglishScheduleProps {
  schedule: GeneratedSchedule;
  scheduleData: ScheduleData;
  optionIndex: number;
}

interface ConcreteMeeting {
  classId: string;
  className: string;
  type?: string;
  day: string;
  start: string;
  end: string;
  startMin: number;
  endMin: number;
  instructor?: string;
  location?: string;
  credits: number;
  groupName?: string | null;
  subgroupName?: string | null;
}

export function PlainEnglishSchedule({
  schedule,
  scheduleData,
  optionIndex,
}: PlainEnglishScheduleProps) {
  const { showToast } = useSchedule();
  const [copied, setCopied] = useState(false);

  const classMap = new Map(scheduleData.classes.map((c) => [c.id, c]));
  const groupMap = new Map(scheduleData.groups.map((g) => [g.id, g]));

  // Build concrete meetings list
  const meetings: ConcreteMeeting[] = [];
  const enrolledClasses = new Set<string>();

  for (const sel of schedule.selections) {
    const cls = classMap.get(sel.classId);
    if (!cls) continue;
    enrolledClasses.add(cls.id);

    const group = cls.groupId ? groupMap.get(cls.groupId) : null;
    const subgroup =
      group && cls.subgroupId
        ? group.subgroups?.find((s) => s.id === cls.subgroupId)
        : null;

    for (const sIdx of sel.sessionIndices) {
      const s = cls.sessions[sIdx];
      if (!s) continue;

      meetings.push({
        classId: cls.id,
        className: cls.name,
        type: cls.type,
        day: s.day,
        start: s.start,
        end: s.end,
        startMin: timeToMin(s.start),
        endMin: timeToMin(s.end),
        instructor: cls.instructor,
        location: cls.location,
        credits: cls.credits || 0,
        groupName: group?.name || null,
        subgroupName: subgroup?.name || null,
      });
    }
  }

  // Calculate high-level summary statistics
  const totalCredits = Array.from(enrolledClasses).reduce((sum, cId) => {
    return sum + (classMap.get(cId)?.credits || 0);
  }, 0);

  const dayOrder = scheduleData.meta.dayOrder;
  const activeDaysSet = new Set(meetings.map((m) => m.day));
  const activeDaysOrdered = dayOrder.filter((d) => activeDaysSet.has(d));
  const freeDays = dayOrder.filter((d) => !activeDaysSet.has(d));

  const earliestStartMin = Math.min(...meetings.map((m) => m.startMin));
  const latestEndMin = Math.max(...meetings.map((m) => m.endMin));

  // Group meetings by day in meta.dayOrder sequence
  const meetingsByDay: Record<string, ConcreteMeeting[]> = {};
  for (const day of activeDaysOrdered) {
    meetingsByDay[day] = meetings
      .filter((m) => m.day === day)
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  }

  // Generate plain text for clipboard
  const generatePlainText = (): string => {
    const lines: string[] = [];
    lines.push(`Schedule Option #${optionIndex + 1} (${scheduleData.meta.termName || 'Term Schedule'})`);
    lines.push('----------------------------------------------------');
    lines.push(`• Total Courses: ${enrolledClasses.size}`);
    lines.push(`• Total Credits: ${totalCredits} cr`);
    lines.push(`• Active Days: ${activeDaysOrdered.join(', ')} (${activeDaysOrdered.length} days)`);
    if (freeDays.length > 0) {
      lines.push(`• Free Days: ${freeDays.join(', ')}`);
    }
    lines.push(`• Hours: ${minToTime(earliestStartMin)} to ${minToTime(latestEndMin)}`);
    lines.push(`• Outside Preferred Hours: ${schedule.scores.timeFit} min`);
    lines.push(`• Total Idle Gap Time: ${schedule.scores.gaps} min`);
    lines.push('');
    lines.push('DAY-BY-DAY ITINERARY:');

    for (const day of activeDaysOrdered) {
      lines.push('');
      lines.push(`=== ${day.toUpperCase()} ===`);
      const dayList = meetingsByDay[day] || [];
      for (let i = 0; i < dayList.length; i++) {
        const m = dayList[i];
        let line = `  ${m.start} - ${m.end}: ${m.className}`;
        if (m.type) line += ` (${m.type.toUpperCase()})`;
        if (m.subgroupName) line += ` [${m.subgroupName}]`;
        if (m.location) line += ` at ${m.location}`;
        if (m.instructor) line += ` with ${m.instructor}`;
        lines.push(line);

        // Check gap
        if (i < dayList.length - 1) {
          const nextM = dayList[i + 1];
          const gap = nextM.startMin - m.endMin;
          if (gap > 0) {
            lines.push(`    ↳ ${gap}-minute break`);
          }
        }
      }
    }

    lines.push('');
    lines.push('ENROLLED COURSES & SECTIONS:');
    for (const cId of enrolledClasses) {
      const cls = classMap.get(cId);
      if (!cls) continue;
      const group = cls.groupId ? groupMap.get(cls.groupId) : null;
      const subgroup = group && cls.subgroupId ? group.subgroups?.find((s) => s.id === cls.subgroupId) : null;
      let desc = `• ${cls.name} (${cls.credits || 0} credits)`;
      if (group) desc += ` - ${group.name}`;
      if (subgroup) desc += ` (${subgroup.name})`;
      lines.push(desc);
    }

    return lines.join('\n');
  };

  const handleCopy = () => {
    const text = generatePlainText();
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        showToast('Plain English schedule copied to clipboard!', 'success', 2500);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        showToast('Could not copy to clipboard.', 'error');
      }
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101224]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Header with Title and Copy Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6C63FF]/20 text-[#8B85FF]">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Schedule in Plain English</h3>
            <p className="text-xs text-slate-400">
              Clear narrative overview and daily itinerary for Option #{optionIndex + 1}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition active:scale-95"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy as Text</span>
            </>
          )}
        </button>
      </div>

      {/* Plain English Narrative Card */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-[#00D4AA]">
          <Sparkles className="h-3.5 w-3.5" />
          Summary Overview
        </div>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
          In this schedule, you are enrolled in <strong className="text-white font-semibold">{enrolledClasses.size} courses</strong> for a total of{' '}
          <strong className="text-white font-semibold">{totalCredits} credits</strong>. Your classes take place on{' '}
          <strong className="text-white font-semibold">
            {activeDaysOrdered.length} day{activeDaysOrdered.length !== 1 ? 's' : ''}
          </strong>{' '}
          ({activeDaysOrdered.join(', ')})
          {freeDays.length > 0 ? (
            <span className="text-slate-400">, leaving <strong className="text-slate-200 font-semibold">{freeDays.join(', ')}</strong> completely free</span>
          ) : (
            ''
          )}.
          Your day begins as early as <strong className="text-white font-semibold">{minToTime(earliestStartMin)}</strong> and finishes by{' '}
          <strong className="text-white font-semibold">{minToTime(latestEndMin)}</strong>. Across the entire week, you have{' '}
          <strong className="text-white font-semibold">
            {schedule.scores.gaps === 0 ? 'zero idle gaps' : `${schedule.scores.gaps} minutes of break time`}
          </strong>{' '}
          between classes, and <strong className="text-white font-semibold">{schedule.scores.timeFit} minutes</strong> scheduled before your preferred arrival or after your preferred departure.
        </p>
      </div>

      {/* Day-by-Day Breakdown */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Day-by-Day Itinerary
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeDaysOrdered.map((day) => {
            const dayMeetings = meetingsByDay[day] || [];
            const dayEarliest = dayMeetings[0]?.start;
            const dayLatest = dayMeetings[dayMeetings.length - 1]?.end;

            return (
              <div
                key={day}
                className="flex flex-col rounded-xl border border-white/10 bg-black/25 p-4 transition hover:border-white/20"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6C63FF]/20 text-xs font-black text-[#8B85FF]">
                      {day}
                    </span>
                    <span className="text-sm font-bold text-white">{day}</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    {dayEarliest} – {dayLatest} ({dayMeetings.length} class{dayMeetings.length !== 1 ? 'es' : ''})
                  </span>
                </div>

                {/* Day Classes */}
                <div className="space-y-3 flex-1">
                  {dayMeetings.map((m, idx) => {
                    const nextM = dayMeetings[idx + 1];
                    const gap = nextM ? nextM.startMin - m.endMin : 0;

                    return (
                      <div key={idx} className="space-y-2">
                        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {m.className}
                            </span>
                            <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                              {m.start} – {m.end}
                            </span>
                          </div>

                          {/* Subgroup / Section Info */}
                          {(m.subgroupName || m.groupName) && (
                            <div className="mt-1 text-[11px] text-[#00D4AA] font-semibold">
                              {m.subgroupName || m.groupName}
                            </div>
                          )}

                          {/* Instructor & Location */}
                          {(m.instructor || m.location) && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                              {m.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-slate-500" />
                                  {m.location}
                                </span>
                              )}
                              {m.instructor && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-slate-500" />
                                  {m.instructor}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Gap Break Indicator between meetings */}
                        {gap > 0 && (
                          <div className="flex items-center gap-2 pl-3 text-[10px] font-semibold text-amber-400/90">
                            <Coffee className="h-3 w-3" />
                            <span>{gap}-minute break before next class</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Classes & Sections Summary */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-300">
          Enrolled Courses &amp; Section Choices
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from(enrolledClasses).map((cId) => {
            const cls = classMap.get(cId);
            if (!cls) return null;
            const group = cls.groupId ? groupMap.get(cls.groupId) : null;
            const subgroup =
              group && cls.subgroupId
                ? group.subgroups?.find((s) => s.id === cls.subgroupId)
                : null;

            return (
              <div
                key={cId}
                className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 p-2.5 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#00D4AA] mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white truncate">{cls.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {cls.credits ? `${cls.credits} credits` : '0 credits'}
                    {subgroup && <span className="text-[#00D4AA] font-medium"> • {subgroup.name}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
