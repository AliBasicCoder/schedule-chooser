import React from 'react';
import { Loader2 } from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';

export function LoadingOverlay() {
  const { isGenerating, generationProgress } = useSchedule();

  if (!isGenerating) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="flex flex-col items-center rounded-2xl border border-white/15 bg-[#101224] p-8 shadow-2xl animate-modal text-center max-w-sm w-full mx-4">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] opacity-25 blur-md animate-pulse"></div>
          <Loader2 className="h-10 w-10 text-[#6C63FF] animate-spin" />
        </div>
        <h3 className="text-base font-bold text-white">Generating Schedules…</h3>
        <p className="mt-1 text-xs text-slate-400">
          {generationProgress && generationProgress.checked > 0
            ? `Found ${generationProgress.found} valid schedules (${generationProgress.checked} checked)`
            : 'Searching for optimal conflict-free combinations…'}
        </p>
      </div>
    </div>
  );
}
