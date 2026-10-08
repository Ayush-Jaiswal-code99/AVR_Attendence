import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ toast, onClose }) {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-cyan-400" />,
  };

  const borders = {
    success: 'border-emerald-500/40 bg-emerald-950/80',
    error: 'border-rose-500/40 bg-rose-950/80',
    warning: 'border-amber-500/40 bg-amber-950/80',
    info: 'border-cyan-500/40 bg-cyan-950/80',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm pointer-events-auto animate-bounce-short">
      <div
        className={`flex items-start space-x-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl ${
          borders[toast.type || 'info']
        }`}
      >
        <div className="shrink-0 mt-0.5">{icons[toast.type || 'info']}</div>
        <div className="flex-1 text-sm text-slate-200">
          {toast.title && <p className="font-semibold text-white mb-0.5">{toast.title}</p>}
          <p className="text-xs text-slate-300">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
