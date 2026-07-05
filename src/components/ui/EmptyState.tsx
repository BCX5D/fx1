import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: Icon;
  title: string;
  body: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon: IconCmp, title, body, action, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-panel/60 px-6 text-center ${compact ? "py-8" : "py-14"}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pine-100 text-pine-700 ring-4 ring-pine-50">
        <IconCmp size={22} aria-hidden />
      </div>
      <p className="font-display text-xl font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-faint">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
