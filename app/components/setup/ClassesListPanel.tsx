import React, { useState, useMemo } from 'react';
import { BookOpen, GraduationCap, ChevronDown, ChevronRight, Pin, X, Search } from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import type { ClassItem, Course } from '../../types/schedule';

export function ClassesListPanel() {
  const {
    scheduleData,
    courses,
    isClassEntirelyCrossed,
    toggleClassCrossOff,
    toggleCourseCrossOff,
    isCourseCrossed,
    isCoursePartiallyCrossed,
    pinnedClasses,
    handlePinClick,
    isSessionCrossed,
  } = useSchedule();

  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(() => {
    // Default: expand all courses
    return new Set(courses.map((c) => c.id));
  });
  const [searchQuery, setSearchQuery] = useState('');

  if (!scheduleData) return null;

  const toggleExpand = (courseId: string) => {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

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

  const filteredCourses = courses.filter((course) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchCourse =
      course.name.toLowerCase().includes(q) ||
      (course.code && course.code.toLowerCase().includes(q));
    const matchClass = course.classes.some(
      (cls) =>
        cls.name.toLowerCase().includes(q) ||
        (cls.instructor && cls.instructor.toLowerCase().includes(q)) ||
        (cls.location && cls.location.toLowerCase().includes(q))
    );
    return matchCourse || matchClass;
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101224]/80 p-5 shadow-xl backdrop-blur-xl">
      {/* Panel Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-[#00D4AA]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Courses & Classes
          </h3>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
            {courses.length} courses • {scheduleData.classes.length} classes
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter courses or classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-56 rounded-lg border border-white/10 bg-white/5 pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:border-[#6C63FF] focus:outline-none transition"
          />
        </div>
      </div>

      {/* Scrollable Course Accordion */}
      <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
        {filteredCourses.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No courses match &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredCourses.map((course) => {
            const isExpanded = expandedCourseIds.has(course.id);
            const courseCrossed = isCourseCrossed(course.id);
            const coursePartial = isCoursePartiallyCrossed(course.id);
            const totalCredits =
              course.credits !== undefined
                ? course.credits
                : course.classes.reduce((sum, c) => sum + (c.credits || 0), 0);

            // Compute breakdown counts
            const lecturesCount = course.classes.filter((c) => c.type === 'lecture').length;
            const labsCount = course.classes.filter((c) => c.type === 'lab').length;
            const tutsCount = course.classes.filter((c) => c.type === 'tutorial').length;
            const componentSummary = [
              lecturesCount > 0 ? `${lecturesCount} lec` : null,
              labsCount > 0 ? `${labsCount} lab` : null,
              tutsCount > 0 ? `${tutsCount} tut` : null,
            ]
              .filter(Boolean)
              .join(' • ');

            return (
              <div
                key={course.id}
                className={`rounded-xl border transition-all ${
                  courseCrossed
                    ? 'border-white/5 bg-white/[0.01] opacity-50'
                    : 'border-white/10 bg-white/[0.025] hover:border-white/15'
                }`}
              >
                {/* Course Header Bar */}
                <div
                  onClick={() => toggleExpand(course.id)}
                  className="flex items-center justify-between gap-2 p-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-white transition shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {course.code && (
                      <span className="rounded bg-[#6C63FF]/20 border border-[#6C63FF]/30 px-1.5 py-0.5 text-[10px] font-bold text-[#8B85FF] font-mono shrink-0">
                        {course.code}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold leading-tight truncate ${
                            courseCrossed ? 'text-slate-400 line-through' : 'text-white'
                          }`}
                        >
                          {course.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        {componentSummary && <span>{componentSummary}</span>}
                        {componentSummary && <span>•</span>}
                        <span>{totalCredits} cr</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 shrink-0"
                  >
                    {courseCrossed ? (
                      <span className="rounded bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-red-300">
                        Excluded
                      </span>
                    ) : coursePartial ? (
                      <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                        Partial
                      </span>
                    ) : null}

                    {/* Course-level toggle cross-off */}
                    <button
                      onClick={() => toggleCourseCrossOff(course.id)}
                      title={courseCrossed ? 'Restore entire course' : 'Cross off entire course'}
                      className={`flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                        courseCrossed
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Expanded Classes List */}
                {isExpanded && (
                  <div className="border-t border-white/5 bg-black/20 p-2.5 space-y-1.5">
                    {course.classes.map((cls) => {
                      const isCrossed = isClassEntirelyCrossed(cls);
                      const isPinned = pinnedClasses[cls.id] !== undefined;
                      const group = cls.groupId
                        ? scheduleData.groups.find((g) => g.id === cls.groupId)
                        : null;

                      // Build group ancestry chain for display
                      const groupAncestry: string[] = [];
                      if (group) {
                        let current: typeof group | undefined = group;
                        while (current) {
                          groupAncestry.unshift(current.name);
                          current = current.parentId
                            ? scheduleData.groups.find((g) => g.id === current!.parentId)
                            : undefined;
                        }
                      }

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
                          className={`group flex items-start gap-2.5 rounded-lg border p-2 transition cursor-pointer ${
                            isCrossed
                              ? 'border-transparent bg-white/[0.01] opacity-40 line-through'
                              : isPinned
                              ? 'border-amber-400/40 bg-amber-400/5 hover:border-amber-400/60'
                              : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                          }`}
                        >
                          {/* Type dot */}
                          <div
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${getTypeDotColor(
                              cls.type
                            )}`}
                          />

                          {/* Class Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[11.5px] font-semibold text-white break-words leading-tight">
                                {cls.name}
                              </span>
                              <span className="text-[9.5px] font-medium text-slate-400 shrink-0 font-mono">
                                {metaInfo}
                              </span>
                            </div>

                            {/* Additional metadata (instructor, location) */}
                            {(cls.instructor || cls.location) && (
                              <div className="mt-0.5 text-[10px] text-slate-400 truncate">
                                {[cls.instructor, cls.location].filter(Boolean).join(' • ')}
                              </div>
                            )}

                            {/* Group ancestry tags */}
                            {groupAncestry.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {groupAncestry.map((name, idx) => (
                                  <span
                                    key={idx}
                                    className={`rounded px-1.5 py-0.5 text-[8.5px] font-semibold border ${
                                      idx === groupAncestry.length - 1
                                        ? 'bg-[#00D4AA]/15 text-[#00D4AA] border-[#00D4AA]/20'
                                        : 'bg-[#6C63FF]/15 text-[#8B85FF] border-[#6C63FF]/20'
                                    }`}
                                  >
                                    {name}
                                  </span>
                                ))}
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
                              className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                                isCrossed
                                  ? 'border-red-500 bg-red-500 text-white'
                                  : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                              }`}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => handlePinClick(cls.id)}
                              title={isPinned ? 'Unpin class' : 'Pin class'}
                              className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                                isPinned
                                  ? 'border-amber-400 bg-amber-400/20 text-amber-400'
                                  : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                              }`}
                            >
                              <Pin className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
