import type { StatCardData } from '../../types';
import {
  DollarSign, Users, UserCheck, Package, CalendarDays, UserRound,
  FileText, Clock, ListOrdered, HeartPulse, AlertCircle, UserPlus,
  AlertTriangle, ShoppingCart, Receipt, Pill, ClipboardList,
  ClipboardCheck, CalendarOff,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  DollarSign, Users, UserCheck, Package, CalendarDays, UserRound,
  FileText, Clock, ListOrdered, HeartPulse, AlertCircle, UserPlus,
  AlertTriangle, ShoppingCart, Receipt, Pill, ClipboardList,
  ClipboardCheck, CalendarOff,
};

interface StatCardProps {
  data: StatCardData;
  index?: number;
}

export default function StatCard({ data, index = 0 }: StatCardProps) {
  const Icon = iconMap[data.icon] || Package;
  const isDanger = data.accent === 'danger';

  return (
    <div
      className={`bg-surface-card rounded-xl border p-5 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 group ${
        isDanger ? 'border-danger/30' : 'border-border'
      }`}
      style={{
        boxShadow: 'var(--shadow-card)',
        animationDelay: `${index * 0.08}s`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className={`text-xs font-medium uppercase tracking-wider leading-tight max-w-[70%] ${
          isDanger ? 'text-danger' : 'text-text-secondary'
        }`}>
          {data.title}
        </p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
          isDanger
            ? 'bg-danger/10 group-hover:bg-danger/15'
            : 'bg-primary-50 group-hover:bg-primary-100'
        }`}>
          <Icon className={`w-4.5 h-4.5 ${isDanger ? 'text-danger' : 'text-primary-600'}`} />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-2xl font-bold tracking-tight ${
          isDanger ? 'text-danger' : 'text-text-primary'
        }`}>
          {data.value}
        </span>
        {data.trend && (
          <span
            className={`text-xs font-semibold flex items-center gap-0.5 ${
              data.trend.direction === 'up' ? 'text-success' : 'text-danger'
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
