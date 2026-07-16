import type { StatCardData } from '../../types';
import {
  DollarSign, Users, UserCheck, Package, CalendarDays, UserRound,
  FileText, Clock, ListOrdered, HeartPulse, AlertCircle, UserPlus,
  AlertTriangle, ShoppingCart, Receipt, Pill, ClipboardList,
  ClipboardCheck, CalendarOff, UserMinus, Briefcase,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  DollarSign, Users, UserCheck, Package, CalendarDays, UserRound,
  FileText, Clock, ListOrdered, HeartPulse, AlertCircle, UserPlus,
  AlertTriangle, ShoppingCart, Receipt, Pill, ClipboardList,
  ClipboardCheck, CalendarOff, UserMinus, Briefcase,
};

interface StatCardProps {
  data: StatCardData;
  index?: number;
}

export default function StatCard({ data, index = 0 }: StatCardProps) {
  const Icon = iconMap[data.icon] || Package;
  const accent = data.accent ?? 'default';

  // Per-accent styling. Accent rides the icon chip + value color (no side
  // stripe). danger metrics invert the trend arrow (attrition rising = bad).
  const styles: Record<string, { title: string; chip: string; icon: string; value: string }> = {
    default: {
      title: 'text-text-secondary',
      chip: 'bg-primary-50 group-hover:bg-primary-100',
      icon: 'text-primary-600',
      value: 'text-text-primary',
    },
    positive: {
      title: 'text-success',
      chip: 'bg-success/10 group-hover:bg-success/15',
      icon: 'text-success',
      value: 'text-success',
    },
    warning: {
      title: 'text-warning',
      chip: 'bg-warning/10 group-hover:bg-warning/15',
      icon: 'text-warning',
      value: 'text-text-primary',
    },
    danger: {
      title: 'text-danger',
      chip: 'bg-danger/10 group-hover:bg-danger/15',
      icon: 'text-danger',
      value: 'text-danger',
    },
  };
  const s = styles[accent];
  const trendGood = accent === 'danger' ? data.trend?.direction === 'down' : data.trend?.direction === 'up';

  return (
    <div
      className={`bg-surface-card rounded-xl border border-border p-5 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 group`}
      style={{
        boxShadow: 'var(--shadow-card)',
        animationDelay: `${index * 0.08}s`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className={`text-xs font-medium uppercase tracking-wider leading-tight max-w-[70%] ${s.title}`}>
          {data.title}
        </p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${s.chip}`}>
          <Icon className={`w-4.5 h-4.5 ${s.icon}`} />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-2xl font-bold tracking-tight ${s.value}`}>
          {data.value}
        </span>
        {data.trend && (
          <span
            className={`text-xs font-semibold flex items-center gap-0.5 ${
              trendGood ? 'text-success' : 'text-danger'
            }`}
          >
            <span className="text-[10px]">
              {data.trend.direction === 'up' ? '↗' : '↘'}
            </span>
            {data.trend.value}
          </span>
        )}
      </div>

      {data.subtitle && (
        <p className="text-xs text-text-muted">{data.subtitle}</p>
      )}

      {/* Inventory breakdown (for the inventory stat card) */}
      {data.breakdown && (
        <div className="mt-3 space-y-1.5">
          {data.breakdown.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-text-secondary">{item.label}:</span>
              <span className="text-text-primary font-medium">{item.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
