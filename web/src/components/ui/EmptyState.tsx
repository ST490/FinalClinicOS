import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  colSpan?: number;
  /** Compact = one-line "all clear" row; default = centered block. */
  compact?: boolean;
}

// ponytail: empty states should recede, not compete with populated rows.
export default function EmptyState({ icon: Icon, message, colSpan, compact }: EmptyStateProps) {
  if (compact) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-5 py-3 text-center text-xs text-text-muted/70 italic">
          <span className="inline-flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            {message}
          </span>
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-8 text-center opacity-60">
        <div className="flex flex-col items-center justify-center gap-1.5">
          <Icon className="w-5 h-5 text-text-muted" />
          <p className="text-xs text-text-secondary">{message}</p>
        </div>
      </td>
    </tr>
  );
}
