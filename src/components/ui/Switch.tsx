interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}

export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <p className="text-[15px] font-medium text-ink">{label}</p>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-faint">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`press relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-pine-700" : "bg-line-strong"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-panel shadow-sm transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}
