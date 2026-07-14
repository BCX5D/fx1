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

function FieldSkeleton({ span }: { span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : undefined}>
      <div className="skeleton mb-1.5 h-3 w-16" />
      <div className="skeleton h-11 w-full rounded-[10px]" />
    </div>
  );
}

/** Shaped to match ItemForm's grid so the "reading a document" and item-detail loads don't jump. */
export function FormFieldsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
      <FieldSkeleton span />
      <FieldSkeleton />
      <FieldSkeleton />
      <div className="grid grid-cols-[1fr_110px] gap-2">
        <FieldSkeleton />
        <FieldSkeleton />
      </div>
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton span />
    </div>
  );
}

/** Mirrors ItemDetail's layout: header, form card, source card, and the actions/history sidebar. */
export function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading item">
      <div className="skeleton mb-6 h-4 w-24" />
      <div className="mb-8 flex items-center gap-3">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
            <FormFieldsSkeleton />
            <div className="skeleton mt-6 h-10 w-32 rounded-[10px]" />
          </div>
          <div className="mt-8">
            <div className="skeleton mb-3 h-3 w-40" />
            <div className="rounded-2xl border border-line bg-panel p-5">
              <div className="skeleton h-4 w-48" />
              <div className="skeleton mt-2 h-3 w-32" />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-panel p-4">
            <div className="skeleton mb-3 h-3 w-16" />
            <div className="space-y-1.5">
              <div className="skeleton h-9 w-full rounded-[10px]" />
              <div className="skeleton h-9 w-full rounded-[10px]" />
              <div className="skeleton h-9 w-full rounded-[10px]" />
            </div>
          </div>
          <div>
            <div className="skeleton mb-3 h-3 w-20" />
            <div className="space-y-3 border-l-2 border-line pl-4">
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-4/5" />
              <div className="skeleton h-3.5 w-3/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** For auth-card pages (Confirmed, ResetPassword) while the session check resolves. */
export function AuthCardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-56" />
      <div className="mt-3 space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-4/5" />
      </div>
      <div className="skeleton mt-6 h-11 w-40 rounded-[10px]" />
    </div>
  );
}

/** Full-page hold while the session resolves, shaped like the app shell it usually leads to. */
export function AppShellSkeleton() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]" aria-busy="true" aria-label="Loading">
      <aside className="hidden border-r border-line bg-panel lg:flex lg:h-dvh lg:flex-col lg:p-4">
        <div className="skeleton mb-8 h-7 w-28" />
        <div className="space-y-1.5">
          <div className="skeleton h-9 w-full rounded-[10px]" />
          <div className="skeleton h-9 w-full rounded-[10px]" />
          <div className="skeleton h-9 w-full rounded-[10px]" />
        </div>
        <div className="my-4 border-t border-line" />
        <div className="space-y-1.5">
          <div className="skeleton h-9 w-full rounded-[10px]" />
          <div className="skeleton h-9 w-full rounded-[10px]" />
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-line bg-panel px-4 lg:hidden">
        <div className="skeleton h-6 w-24" />
      </header>
      <main className="min-w-0">
        <div className="mx-auto w-full max-w-[1080px] px-4 py-8 sm:px-8 lg:py-12">
          <DashboardSkeleton />
        </div>
      </main>
    </div>
  );
}
