import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

const PALETTE = ['#6fb3e0', '#8b93d9', '#f59e0b', '#ef4444', '#4ade80', '#3b82f6', '#ec4899', '#14b8a6'];

/**
 * Donut chart with a centered total count label and a legend with counts.
 *
 * Extends the PieChartCard pattern with a custom center label
 * instead of modifying the existing component.
 */
export function DonutChart({
  title,
  data,
  nameKey,
  valueKey,
  height = 240,
}: {
  title: string;
  data: Record<string, any>[];
  nameKey: string;
  valueKey: string;
  height?: number;
}) {
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0);

  return (
    <div
      className="bg-surface-card rounded-xl border border-border p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <h3 className="text-sm font-bold text-text-primary mb-4">{title}</h3>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Chart */}
        <div className="relative" style={{ width: 200, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={85}
                innerRadius={55}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-card)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center total label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-text-primary">{total.toLocaleString()}</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <span className="text-text-secondary">{d[nameKey]}</span>
              <span className="text-text-primary font-semibold ml-auto pl-3">
                {Number(d[valueKey]).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
