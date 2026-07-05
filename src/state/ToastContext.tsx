import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";

interface Toast { id: number; text: string; tone: "ok" | "error" }
interface ToastValue { toast: (text: string, tone?: "ok" | "error") => void }

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

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
            <span>{t.text}</span>
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
