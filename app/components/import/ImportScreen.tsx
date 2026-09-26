import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileCode,
  Sparkles,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import { SAMPLE_FALL_2026 } from '../../data/samples';
import type { ScheduleData, ValidationResult } from '../../types/schedule';
import { validateScheduleJSON } from '../../utils/validation';

export function ImportScreen() {
  const { scheduleData, loadScheduleData, clearScheduleData, setScreen, showToast } = useSchedule();
  const [pasteText, setPasteText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(() => {
    if (scheduleData) {
      return validateScheduleJSON(scheduleData);
    }
    return null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      const res = validateScheduleJSON(parsed);
      setValidationResult(res);

      if (res.valid && res.data) {
        loadScheduleData(res.data);
        showToast('Schedule data validated successfully!', 'success', 2500);
      } else {
        showToast('JSON has validation errors. Review below.', 'error', 3500);
      }
    } catch (err: any) {
      showToast(`Invalid JSON: ${err.message}`, 'error', 4500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessJSON(text);
    };
    reader.onerror = () => showToast('Failed to read file.', 'error');
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleProcessJSON(text);
      };
      reader.onerror = () => showToast('Failed to read file.', 'error');
      reader.readAsText(file);
    }
  };

  const handleLoadSample = () => {
    const res = validateScheduleJSON(SAMPLE_FALL_2026);
    setValidationResult(res);
    if (res.valid && res.data) {
      loadScheduleData(res.data);
      showToast('Fall 2026 Sample schedule loaded!', 'success', 2200);
    }
  };

  const handleLoadCS4Sample = async () => {
    try {
      const resp = await fetch('/sch.json');
      if (!resp.ok) throw new Error('Could not fetch sample');
      const data = await resp.json();
      const res = validateScheduleJSON(data);
      setValidationResult(res);
      if (res.valid && res.data) {
        loadScheduleData(res.data);
        showToast('Fourth Level CS Sample loaded!', 'success', 2200);
      }
    } catch {
      showToast('Failed to load Fourth Level CS sample schedule.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      {/* Header with floating badge */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] shadow-2xl shadow-[#6C63FF]/30 animate-float">
          <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="8" width="40" height="34" rx="6" stroke="#ffffff" strokeWidth="2.5" />
            <line x1="4" y1="18" x2="44" y2="18" stroke="#ffffff" strokeWidth="2" />
            <circle cx="14" cy="13" r="2.5" fill="#ffffff" />
            <circle cx="24" cy="13" r="2.5" fill="#00D4AA" />
            <circle cx="34" cy="13" r="2.5" fill="#FFB020" />
            <rect x="10" y="24" width="10" height="6" rx="2" fill="#ffffff" opacity="0.8" />
            <rect x="24" y="24" width="14" height="6" rx="2" fill="#00D4AA" opacity="0.85" />
            <rect x="10" y="33" width="14" height="6" rx="2" fill="#FFB020" opacity="0.85" />
            <rect x="28" y="33" width="10" height="6" rx="2" fill="#FF6B9D" opacity="0.85" />
          </svg>
        </div>
        <h1 className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
          Schedule Optimizer
        </h1>
        <p className="mt-2 text-sm text-slate-400 sm:text-base">
          Upload your course data and automatically find your ideal conflict-free weekly schedule.
        </p>
      </div>

      {/* Main Import Card */}
      <div className="rounded-2xl border border-white/10 bg-[#101224]/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Upload Drag & Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
            dragOver
              ? 'border-[#6C63FF] bg-[#6C63FF]/10'
              : 'border-white/15 bg-white/[0.02] hover:border-[#6C63FF]/70 hover:bg-[#6C63FF]/5'
          }`}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#6C63FF]/15 text-[#8B85FF]">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-white">Drag &amp; drop your schedule JSON</p>
          <p className="mt-1 text-xs text-slate-400">or click to browse from your computer</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10"></div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">OR</span>
          <div className="h-px flex-1 bg-white/10"></div>
        </div>

        {/* JSON Paste Section */}
        <div className="mb-6 space-y-2">
          <label htmlFor="json-paste-box" className="block text-xs font-semibold text-slate-300">
            Paste JSON directly
          </label>
          <textarea
            id="json-paste-box"
            rows={4}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            spellCheck={false}
            placeholder='{ "meta": { ... }, "groups": [ ... ], "classes": [ ... ] }'
            className="w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-[#6C63FF] focus:outline-none focus:ring-1 focus:ring-[#6C63FF]"
          />
          <button
            onClick={() => handleProcessJSON(pasteText)}
            disabled={!pasteText.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/15 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <FileCode className="h-4 w-4" />
            Load from Paste
          </button>
        </div>

        {/* Sample Schedules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleLoadSample}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] py-3 px-4 text-xs font-semibold text-white shadow-lg shadow-[#6C63FF]/25 hover:opacity-95 active:scale-[0.99] transition"
          >
            <Sparkles className="h-4 w-4 text-[#00D4AA]" />
            Sample Schedule (Fall 2026)
          </button>
          <button
            onClick={handleLoadCS4Sample}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 px-4 text-xs font-semibold text-slate-200 hover:bg-white/10 active:scale-[0.99] transition"
          >
            <BookOpen className="h-4 w-4 text-[#FFB020]" />
            Full CS Term Sample
          </button>
        </div>
      </div>

      {/* Validation Summary Card (if data loaded or attempted) */}
      {validationResult && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#101224]/90 p-6 shadow-xl backdrop-blur-xl animate-fade-slide">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Validation Summary</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                validationResult.valid
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              }`}
            >
              {validationResult.valid ? 'Ready to optimize' : 'Validation errors found'}
            </span>
          </div>

          {/* Stats grid */}
          {validationResult.stats && (
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <div className="text-xl font-black bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
                  {validationResult.stats.courses}
                </div>
                <div className="text-[11px] font-medium text-slate-400">Courses</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <div className="text-xl font-black bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
                  {validationResult.stats.classes}
                </div>
                <div className="text-[11px] font-medium text-slate-400">Classes</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <div className="text-xl font-black bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
                  {validationResult.stats.groups}
                </div>
                <div className="text-[11px] font-medium text-slate-400">Groups</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <div className="text-xl font-black bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
                  {validationResult.stats.requiredGroups}
                </div>
                <div className="text-[11px] font-medium text-slate-400">Required Groups</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center col-span-2 sm:col-span-1">
                <div className="text-xl font-black bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
                  {validationResult.stats.totalSessions}
                </div>
                <div className="text-[11px] font-medium text-slate-400">Total Sessions</div>
              </div>
            </div>
          )}

          {/* Errors list */}
          {validationResult.errors.length > 0 && (
            <div className="mb-4 space-y-1.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              {validationResult.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Warnings list */}
          {validationResult.warnings.length > 0 && (
            <div className="mb-4 space-y-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
              {validationResult.warnings.map((warn, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScreen('setup')}
              disabled={!validationResult.valid}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] py-3 px-5 text-xs font-bold text-white shadow-lg shadow-[#6C63FF]/30 hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Proceed to Setup
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setValidationResult(null);
                clearScheduleData();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
