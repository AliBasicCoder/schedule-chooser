import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import type { ToastType } from '../types/schedule';

export function ToastContainer() {
  const { toasts, dismissToast } = useSchedule();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        const getStyle = (type: ToastType) => {
          switch (type) {
            case 'success':
              return 'bg-[#00D4AA]/15 border-[#00D4AA]/40 text-[#00D4AA]';
            case 'error':
              return 'bg-[#FF4757]/15 border-[#FF4757]/40 text-[#FF4757]';
            case 'warning':
              return 'bg-[#FFB020]/15 border-[#FFB020]/40 text-[#FFB020]';
            default:
              return 'bg-[#6C63FF]/15 border-[#6C63FF]/40 text-[#8B85FF]';
          }
        };

        const getIcon = (type: ToastType) => {
          switch (type) {
            case 'success':
              return <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00D4AA]" />;
            case 'error':
              return <AlertCircle className="h-4 w-4 shrink-0 text-[#FF4757]" />;
            case 'warning':
              return <AlertTriangle className="h-4 w-4 shrink-0 text-[#FFB020]" />;
            default:
              return <Info className="h-4 w-4 shrink-0 text-[#8B85FF]" />;
          }
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-3.5 shadow-xl backdrop-blur-xl animate-fade-slide ${getStyle(
              toast.type
            )}`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {getIcon(toast.type)}
              <span className="text-xs font-medium text-white truncate">{toast.text}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
