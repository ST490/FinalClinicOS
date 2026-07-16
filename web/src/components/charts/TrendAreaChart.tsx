import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

const SERIES_A = '#6fb3e0';
const SERIES_B = '#8b93d9';

const axisStyle = { fontSize: 11, fill: 'var(--color-text-muted)' } as const;

/**
 * Dual-series area chart card.
 *
 * Renders two filled area series (e.g. Headcount vs Attrition)
 * using the project's chart palette.
 */
export function TrendAreaChart({
  title,
  data,
  xKey,
  seriesA,
  seriesB,
  labelA = seriesA,
  labelB = seriesB,
  height = 260,
}: {
  title: string;
  data: Record<string, any>[];
  xKey: string;
  seriesA: string;
  seriesB: string;
  labelA?: string;
  labelB?: string;
  height?: number;
}) {
  return (
    <div
      className="bg-surface-card rounded-xl border border-border p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <h3 className="text-sm font-bold text-text-primary mb-4">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
            <defs>
              <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={SERIES_A} stopOpacity={0.3} />
                <stop offset="95%" stopColor={SERIES_A} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={SERIES_B} stopOpacity={0.3} />
                <stop offset="95%" stopColor={SERIES_B} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-card)',
                color: 'var(--color-text-primary)',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey={seriesA}
              name={labelA}
              stroke={SERIES_A}
              strokeWidth={2.5}
              fill="url(#gradA)"
              dot={{ r: 3, fill: 'var(--color-surface-card)', stroke: SERIES_A, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
            <Area
              type="monotone"
              dataKey={seriesB}
              name={labelB}
              stroke={SERIES_B}
              strokeWidth={2.5}
              fill="url(#gradB)"
              dot={{ r: 3, fill: 'var(--color-surface-card)', stroke: SERIES_B, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
