/**
 * Skeleton loaders that match the Careme design system.
 */

function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-border/60 ${className}`}
      style={style}
    />
  );
}

/** Skeleton for a stats card row (4 cards) */
export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-surface-card p-5 space-y-3"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a data table */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="bg-surface-card border border-border rounded-xl overflow-hidden"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 py-3.5 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 max-w-[120px]" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-5 py-4 flex items-center gap-6 border-b border-border last:border-0">
          {/* Avatar */}
          <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
          {/* Columns */}
          {Array.from({ length: cols - 1 }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-3 flex-1"
              style={{ maxWidth: c === 0 ? '160px' : '100px' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton for card grid */
export function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-surface-card p-5 space-y-4"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Full-page centered loading spinner */
export function PageSpinner({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 animate-fade-in">
      <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      <p className="text-sm text-text-muted font-medium">{message}</p>
    </div>
  );
}

export default Skeleton;
