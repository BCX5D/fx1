import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { useFocusTrap } from "../../lib/useFocusTrap";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, panelRef, onClose);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-pine-950/40"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="toast-in relative w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-(--shadow-float) outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-medium text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press -m-1 rounded-lg p-1 text-ink-faint hover:bg-pine-50 hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
