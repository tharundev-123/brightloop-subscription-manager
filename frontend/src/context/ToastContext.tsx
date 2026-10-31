import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  subMessage?: string;
}

interface ToastContextType {
  toast: {
    success: (message: string, subMessage?: string) => void;
    error: (message: string, subMessage?: string) => void;
    info: (message: string, subMessage?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, message: string, subMessage?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message, subMessage }]);

    // Auto dismiss after 4.5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string, sub?: string) => addToast('success', msg, sub),
    error: (msg: string, sub?: string) => addToast('error', msg, sub),
    info: (msg: string, sub?: string) => addToast('info', msg, sub),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container floating at top-right */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-elevated transition-all duration-300 animate-in slide-in-from-top-2 ${
              t.type === 'success'
                ? 'bg-white border-emerald-200 text-slate-800'
                : t.type === 'error'
                ? 'bg-white border-rose-200 text-slate-800'
                : 'bg-white border-indigo-200 text-slate-800'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-indigo-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold tracking-tight">{t.message}</div>
              {t.subMessage && (
                <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.subMessage}</div>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

