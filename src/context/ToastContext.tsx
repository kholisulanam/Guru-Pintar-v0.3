import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

export interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (messageOrOptions: string | ToastOptions, type?: ToastType) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global subscriber for non-React module calls
let globalToastHandler: ((toast: Omit<ToastItem, 'id' | 'timestamp'>) => void) | null = null;

// Sound effects using Web Audio API
const playToastSound = (type: ToastType) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    if (type === 'success') {
      // Gentle cheerful 2-tone chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.1); // A5
      gain2.gain.setValueAtTime(0.15, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.45);
    } else if (type === 'error') {
      // Low dual warning tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(190, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) {
    // Ignore audio errors on autoplay restrictions
  }
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((item: Omit<ToastItem, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = item.duration ?? (item.type === 'error' ? 5000 : 3800);
    const newToast: ToastItem = {
      ...item,
      id,
      duration,
      timestamp: Date.now(),
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep max 5 visible
    playToastSound(item.type);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  // Register global handler
  React.useEffect(() => {
    globalToastHandler = addToast;
    return () => {
      globalToastHandler = null;
    };
  }, [addToast]);

  const showToast = useCallback(
    (messageOrOptions: string | ToastOptions, type: ToastType = 'info') => {
      if (typeof messageOrOptions === 'string') {
        const defaultTitle =
          type === 'success'
            ? 'Berhasil Disimpan'
            : type === 'error'
            ? 'Gagal Disimpan'
            : type === 'warning'
            ? 'Peringatan'
            : 'Pemberitahuan';
        addToast({
          type,
          title: defaultTitle,
          message: messageOrOptions,
        });
      } else {
        const resolvedType = messageOrOptions.type || type;
        const defaultTitle =
          resolvedType === 'success'
            ? 'Berhasil Disimpan'
            : resolvedType === 'error'
            ? 'Gagal Disimpan'
            : resolvedType === 'warning'
            ? 'Peringatan'
            : 'Pemberitahuan';
        addToast({
          type: resolvedType,
          title: messageOrOptions.title || defaultTitle,
          message: messageOrOptions.message,
          duration: messageOrOptions.duration,
        });
      }
    },
    [addToast]
  );

  const success = useCallback(
    (message: string, title = 'Berhasil Disimpan') => {
      addToast({ type: 'success', title, message });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, title = 'Gagal Disimpan') => {
      addToast({ type: 'error', title, message });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, title = 'Peringatan') => {
      addToast({ type: 'warning', title, message });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, title = 'Pemberitahuan') => {
      addToast({ type: 'info', title, message });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        warning,
        info,
        removeToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback safe object if used outside provider
    return {
      toasts: [],
      showToast: (msg: string | ToastOptions, type?: ToastType) => {
        if (globalToastHandler) {
          const message = typeof msg === 'string' ? msg : msg.message;
          const t = typeof msg === 'object' && msg.type ? msg.type : type || 'info';
          globalToastHandler({
            type: t,
            title: typeof msg === 'object' && msg.title ? msg.title : t === 'success' ? 'Berhasil Disimpan' : 'Pemberitahuan',
            message,
          });
        } else {
          console.log(`[Toast ${type || 'info'}]:`, msg);
        }
      },
      success: (msg: string, title = 'Berhasil Disimpan') => {
        if (globalToastHandler) globalToastHandler({ type: 'success', title, message: msg });
        else console.log(`[Toast Success]: ${title} - ${msg}`);
      },
      error: (msg: string, title = 'Gagal Disimpan') => {
        if (globalToastHandler) globalToastHandler({ type: 'error', title, message: msg });
        else console.error(`[Toast Error]: ${title} - ${msg}`);
      },
      warning: (msg: string, title = 'Peringatan') => {
        if (globalToastHandler) globalToastHandler({ type: 'warning', title, message: msg });
        else console.warn(`[Toast Warning]: ${title} - ${msg}`);
      },
      info: (msg: string, title = 'Pemberitahuan') => {
        if (globalToastHandler) globalToastHandler({ type: 'info', title, message: msg });
        else console.info(`[Toast Info]: ${title} - ${msg}`);
      },
      removeToast: () => {},
    };
  }
  return context;
};

// Global direct export helper for services / non-React files
export const toast = {
  success: (message: string, title = 'Berhasil Disimpan') => {
    if (globalToastHandler) globalToastHandler({ type: 'success', title, message });
    else console.log(`[Toast Success]: ${title} - ${message}`);
  },
  error: (message: string, title = 'Gagal Disimpan') => {
    if (globalToastHandler) globalToastHandler({ type: 'error', title, message });
    else console.error(`[Toast Error]: ${title} - ${message}`);
  },
  warning: (message: string, title = 'Peringatan') => {
    if (globalToastHandler) globalToastHandler({ type: 'warning', title, message });
    else console.warn(`[Toast Warning]: ${title} - ${message}`);
  },
  info: (message: string, title = 'Pemberitahuan') => {
    if (globalToastHandler) globalToastHandler({ type: 'info', title, message });
    else console.info(`[Toast Info]: ${title} - ${message}`);
  },
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-[92vw] sm:max-w-md w-full pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';
  const isInfo = toast.type === 'info';

  const colorStyles = isSuccess
    ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
    : isError
    ? 'bg-slate-900/95 border-rose-500/60 text-rose-100 shadow-rose-950/50'
    : isWarning
    ? 'bg-slate-900/95 border-amber-500/50 text-amber-100 shadow-amber-950/50'
    : 'bg-slate-900/95 border-sky-500/50 text-sky-100 shadow-sky-950/50';

  const iconBg = isSuccess
    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
    : isError
    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
    : isWarning
    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
    : 'bg-sky-500/20 text-sky-400 border border-sky-500/40';

  const titleColor = isSuccess
    ? 'text-emerald-400'
    : isError
    ? 'text-rose-400'
    : isWarning
    ? 'text-amber-400'
    : 'text-sky-400';

  const progressBarBg = isSuccess
    ? 'bg-emerald-500'
    : isError
    ? 'bg-rose-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-sky-500';

  return (
    <div
      className={`pointer-events-auto w-full border backdrop-blur-md rounded-2xl p-3.5 shadow-2xl transition-all transform animate-in slide-in-from-top-3 fade-in duration-200 relative overflow-hidden ${colorStyles}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl flex-shrink-0 ${iconBg}`}>
          {isSuccess && <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />}
          {isError && <AlertTriangle className="w-5 h-5 stroke-[2.5]" />}
          {isWarning && <AlertCircle className="w-5 h-5 stroke-[2.5]" />}
          {isInfo && <Info className="w-5 h-5 stroke-[2.5]" />}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <h4 className={`text-xs font-bold uppercase tracking-wider ${titleColor}`}>
            {toast.title}
          </h4>
          <p className="text-xs text-slate-200 mt-0.5 leading-relaxed break-words font-medium">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition flex-shrink-0 -mr-1 -mt-1"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Subtle bottom progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80">
          <div
            className={`h-full ${progressBarBg}`}
            style={{
              animation: `toastProgress ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};
