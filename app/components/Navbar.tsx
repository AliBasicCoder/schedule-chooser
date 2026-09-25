import React from 'react';
import { Calendar, RotateCcw, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';

export function Navbar() {
  const { currentScreen, setScreen, scheduleData, resetAll } = useSchedule();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#07080f]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo and Term Title */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setScreen('import')}
            className="flex cursor-pointer items-center gap-2.5 transition hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] shadow-lg shadow-[#6C63FF]/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white">Schedule Optimizer</span>
              {scheduleData?.meta.termName && (
                <div className="text-xs font-medium text-slate-400">
                  {scheduleData.meta.termName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Step Pills */}
        {scheduleData && (
          <nav className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1 md:flex">
            <button
              onClick={() => setScreen('import')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                currentScreen === 'import'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Import
            </button>
            <span className="text-xs text-slate-600">/</span>
            <button
              onClick={() => setScreen('setup')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                currentScreen === 'setup'
                  ? 'bg-[#6C63FF] text-white shadow-md shadow-[#6C63FF]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Setup & Rules
            </button>
            <span className="text-xs text-slate-600">/</span>
            <button
              onClick={() => setScreen('results')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                currentScreen === 'results'
                  ? 'bg-[#00D4AA] text-slate-950 shadow-md shadow-[#00D4AA]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3. Results
            </button>
          </nav>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {currentScreen === 'setup' && (
            <button
              onClick={() => {
                if (window.confirm('Reset all pins, cross-offs, blocked slots, and preferences?')) {
                  resetAll();
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All
            </button>
          )}

          {currentScreen !== 'import' && (
            <button
              onClick={() => setScreen('import')}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              New Data
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
