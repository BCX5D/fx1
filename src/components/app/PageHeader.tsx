import type { ReactNode } from "react";

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[34px] font-medium leading-tight tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-ink-soft">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
