import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";

interface Toast {
  id: number;
  text: string;
  tone: "ok" | "error";
  actionLabel?: string;
  onAction?: () => void;
}

/** Optional undo (or other single follow-up) action shown on the toast itself. */
interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  /** Defaults to 4200ms; pass a longer value when an action needs time to be noticed and clicked. */
  durationMs?: number;
}

interface ToastValue { toast: (text: string, tone?: "ok" | "error", opts?: ToastOptions) => void }

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback((text: string, tone: "ok" | "error" = "ok", opts?: ToastOptions) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, text, tone, actionLabel: opts?.actionLabel, onAction: opts?.onAction }]);
    setTimeout(() => dismiss(id), opts?.durationMs ?? 4200);
  }, [dismiss]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border border-pine-800 bg-pine-900 px-4 py-3 text-sm text-paper shadow-lg shadow-pine-900/20"
          >
            {t.tone === "ok"
              ? <CheckCircle size={18} weight="fill" className="shrink-0 text-pine-200" aria-hidden />
              : <WarningCircle size={18} weight="fill" className="shrink-0 text-alert-200" aria-hidden />}
            <span className="flex-1">{t.text}</span>
            {t.actionLabel && t.onAction && (
              <button
                type="button"
                onClick={() => { t.onAction!(); dismiss(t.id); }}
                className="press shrink-0 rounded-[8px] px-1.5 py-0.5 text-sm font-semibold text-pine-200 underline hover:text-paper hover:no-underline"
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx;
}
