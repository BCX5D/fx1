import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldChrome {
  label: string;
  helper?: string;
  error?: string;
  flagged?: boolean;
}

const CONTROL =
  "w-full rounded-[10px] border bg-panel px-3.5 text-[15px] text-ink placeholder:text-ink-faint " +
  "transition-colors focus:border-pine-600 focus:outline-none focus:ring-2 focus:ring-pine-200";

function chromeBorder(error?: string, flagged?: boolean) {
  if (error) return "border-alert-700";
  if (flagged) return "border-ember-700";
  return "border-line-strong";
}

function FieldShell({ id, label, helper, error, flagged, children }: FieldChrome & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink-soft">
        {label}
        {flagged && !error && (
          <span className="ml-2 rounded-full bg-ember-100 px-2 py-0.5 text-[11px] font-medium text-ember-800">
            please confirm
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] text-alert-700" role="alert">{error}</p>
      ) : helper ? (
        <p className="text-[13px] text-ink-faint">{helper}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ label, helper, error, flagged, className = "", ...rest }: FieldChrome & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} helper={helper} error={error} flagged={flagged}>
      <input id={id} className={`${CONTROL} h-11 ${chromeBorder(error, flagged)} ${className}`} aria-invalid={!!error} {...rest} />
    </FieldShell>
  );
}

export function SelectInput({ label, helper, error, flagged, className = "", children, ...rest }: FieldChrome & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} helper={helper} error={error} flagged={flagged}>
      <select id={id} className={`${CONTROL} h-11 ${chromeBorder(error, flagged)} ${className}`} aria-invalid={!!error} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextArea({ label, helper, error, flagged, className = "", ...rest }: FieldChrome & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} helper={helper} error={error} flagged={flagged}>
      <textarea id={id} className={`${CONTROL} min-h-24 py-2.5 ${chromeBorder(error, flagged)} ${className}`} aria-invalid={!!error} {...rest} />
    </FieldShell>
  );
}
