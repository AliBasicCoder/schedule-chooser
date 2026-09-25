import React from 'react';
import {
  Zap,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import { ClassesListPanel } from './ClassesListPanel';
import { GroupsPanel } from './GroupsPanel';
import { PreferencesPanel } from './PreferencesPanel';
import { ScheduleGrid } from './ScheduleGrid';

export function SetupScreen() {
  const {
    scheduleData,
    setScreen,
    resetAll,
    runScheduleGeneration,
    pinConflicts,
    isGenerating,
  } = useSchedule();

  if (!scheduleData) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-white">No Schedule Data Loaded</h2>
        <p className="mt-2 text-sm text-slate-400">Please import your schedule JSON first.</p>
        <button
          onClick={() => setScreen('import')}
          className="mt-4 flex items-center gap-2 rounded-xl bg-[#6C63FF] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#6C63FF]/30"
        >
          <ArrowLeft className="h-4 w-4" /> Go to Import
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      {/* Setup Top Toolbar: Back, Term Title, Legend */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('import')}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Import
          </button>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">
              {scheduleData.meta.termName || 'Schedule Setup'}
            </h1>
            <p className="text-xs text-slate-400">
              Pin sessions, cross off courses, or click time slots to block them.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3.5 rounded-xl border border-white/10 bg-[#101224]/80 px-4 py-2 text-xs shadow-md">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#6C63FF]"></span>
            <span>Lecture</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#00D4AA]"></span>
            <span>Lab</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#FFB020]"></span>
            <span>Tutorial</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#FF6B9D]"></span>
            <span>Other</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm blocked-stripes border border-red-500/40"></span>
            <span>Blocked</span>
          </div>
        </div>
      </div>

      {/* Main Grid + Sidebar Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start pb-28">
        {/* Main Grid Area (8 cols on large screens) */}
        <div className="lg:col-span-8 space-y-4">
          <ScheduleGrid data={scheduleData} interactive={true} />
        </div>

        {/* Side Panel (4 cols on large screens) */}
        <div className="lg:col-span-4 space-y-5">
          <PreferencesPanel />
          <GroupsPanel />
          <ClassesListPanel />
        </div>
      </div>

      {/* Sticky Bottom Generate Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center gap-2.5 border-t border-white/10 bg-[#07080f]/90 px-4 py-4 backdrop-blur-xl">
        {/* Real-time Conflict Banner */}
        {pinConflicts.length > 0 && (
          <div className="flex w-full max-w-2xl items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-xs text-red-300 animate-fade-slide">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <div className="flex-1 space-y-0.5">
              {pinConflicts.map((c, i) => (
                <div key={i}>{c}</div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={runScheduleGeneration}
          disabled={pinConflicts.length > 0 || isGenerating}
          className="group relative flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#6C63FF] via-[#8B5CF6] to-[#00D4AA] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#6C63FF]/30 transition hover:shadow-[#6C63FF]/50 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Zap className="h-4 w-4 fill-white text-white group-hover:animate-bounce" />
          <span>Generate Best Schedules</span>
        </button>
      </div>
    </div>
  );
}
