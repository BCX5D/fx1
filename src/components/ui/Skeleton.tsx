/** Skeletons sized to match the real rows they stand in for, so nothing jumps on load. */

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4" aria-hidden="true">
      <div className="skeleton h-9 w-9 shrink-0 rounded-[10px]" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-2/5" />
        <div className="skeleton h-3 w-1/4" />
      </div>
      <div className="skeleton h-3.5 w-16" />
      <div className="skeleton h-6 w-20 rounded-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard">
      <div className="skeleton mb-2 h-8 w-64" />
      <div className="skeleton mb-10 h-4 w-96 max-w-full" />
      <div className="skeleton mb-3 h-4 w-40" />
      <div className="divide-y divide-line rounded-2xl border border-line bg-panel px-5">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="divide-y divide-line rounded-2xl border border-line bg-panel px-5">
      {Array.from({ length: rows }, (_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}
