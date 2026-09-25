import React from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Hourglass,
  Sparkles,
  Trophy,
  Frown,
  ChevronDown,
} from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import { ScheduleGrid } from '../setup/ScheduleGrid';
import { PlainEnglishSchedule } from './PlainEnglishSchedule';

export function ResultsScreen() {
  const {
    scheduleData,
    generatedSchedules,
    activeResultIndex,
    setActiveResultIndex,
    showAllResults,
    setShowAllResults,
    preferences,
    setScreen,
  } = useSchedule();

  if (!scheduleData) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-white">No Schedule Data Loaded</h2>
        <button
          onClick={() => setScreen('import')}
          className="mt-4 rounded-xl bg-[#6C63FF] px-4 py-2 text-xs font-semibold text-white shadow-lg"
        >
          Go to Import
        </button>
      </div>
    );
  }

  // Handle zero results
  if (generatedSchedules.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-3xl border border-white/10 bg-[#101224]/90 p-8 shadow-2xl backdrop-blur-xl animate-fade-slide">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-3xl">
            <Frown className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white">No Valid Schedules Found</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            No schedule combination could satisfy all your active pins, blocked slots, and required
            groups.
          </p>
          <div className="mt-4 rounded-xl bg-white/[0.03] p-3 text-left text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-200">Suggestions:</div>
            <div>• Unpin some classes to give the solver more flexibility</div>
            <div>• Unblock time slots that may clash with mandatory lectures</div>
            <div>• Verify that required groups don't have all sections crossed off</div>
          </div>
          <button
            onClick={() => setScreen('setup')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] py-3 text-xs font-bold text-white shadow-lg shadow-[#6C63FF]/30 hover:opacity-95 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Adjust Setup &amp; Rules
          </button>
        </div>
      </div>
    );
  }

  const activeSchedule = generatedSchedules[activeResultIndex];
  const maxTabs = showAllResults ? Math.min(5, generatedSchedules.length) : 1;
  const shownSchedules = generatedSchedules.slice(0, maxTabs);

  // Compute best scores across all displayed options
  const bestScores = {
    timeFit: Math.min(...shownSchedules.map((s) => s.scores.timeFit)),
    days: Math.min(...shownSchedules.map((s) => s.scores.days)),
    gaps: Math.min(...shownSchedules.map((s) => s.scores.gaps)),
  };

  const getMetricConfig = (criterion: string) => {
    switch (criterion) {
      case 'timeFit':
        return {
          icon: <Clock className="h-5 w-5 text-[#8B85FF]" />,
          label: 'Outside Preferred Hours',
          unit: 'min',
        };
      case 'days':
        return {
          icon: <Calendar className="h-5 w-5 text-[#00D4AA]" />,
          label: 'Days on Campus',
          unit: 'days',
        };
      case 'gaps':
      default:
        return {
          icon: <Hourglass className="h-5 w-5 text-[#FFB020]" />,
          label: 'Total Gap Time',
          unit: 'min',
        };
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('setup')}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Setup
          </button>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Your Best Schedules</h1>
            <p className="text-xs text-slate-400">
              Ranked conflict-free combinations based on your preferences.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#00D4AA]/30 bg-[#00D4AA]/10 px-3.5 py-1.5 text-xs font-semibold text-[#00D4AA]">
          {generatedSchedules.length} valid schedule{generatedSchedules.length > 1 ? 's' : ''} found
        </div>
      </div>

      {/* Tabs for Top Results */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Array.from({ length: maxTabs }).map((_, idx) => {
          const isActive = idx === activeResultIndex;
          return (
            <button
              key={idx}
              onClick={() => setActiveResultIndex(idx)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
                isActive
                  ? 'bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white shadow-[#6C63FF]/30 shadow-md'
                  : 'border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {idx === 0 && <Trophy className="h-3.5 w-3.5 text-amber-300" />}
              <span>Option #{idx + 1}</span>
            </button>
          );
        })}

        {!showAllResults && generatedSchedules.length > 1 && (
          <button
            onClick={() => setShowAllResults(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Show More Options (#2–#5)
          </button>
        )}
      </div>

      {/* Schedule Grid View */}
      {activeSchedule && (
        <div className="space-y-6">
          <ScheduleGrid
            data={scheduleData}
            interactive={false}
            selections={activeSchedule.selections}
          />

          {/* Scorecard */}
          <div className="rounded-2xl border border-white/10 bg-[#101224]/90 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Schedule Scorecard (Option #{activeResultIndex + 1})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {preferences.priorityOrder.map((criterion) => {
                const config = getMetricConfig(criterion);
                const scoreValue = (activeSchedule.scores as any)[criterion];
                const isBest =
                  shownSchedules.length > 1 && scoreValue === (bestScores as any)[criterion];

                return (
                  <div
                    key={criterion}
                    className={`relative rounded-xl border p-4 text-center transition ${
                      isBest
                        ? 'border-[#00D4AA]/40 bg-[#00D4AA]/10 shadow-lg shadow-[#00D4AA]/10'
                        : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    {isBest && (
                      <span className="absolute top-2.5 right-2.5 rounded bg-[#00D4AA] px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-950">
                        ★ Best
                      </span>
                    )}
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                      {config.icon}
                    </div>
                    <div className="text-2xl font-black bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                      {scoreValue}
                      <span className="ml-1 text-xs font-normal text-slate-400">{config.unit}</span>
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-300">{config.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plain English Schedule Breakdown */}
          <PlainEnglishSchedule
            schedule={activeSchedule}
            scheduleData={scheduleData}
            optionIndex={activeResultIndex}
          />
        </div>
      )}
    </div>
  );
}
