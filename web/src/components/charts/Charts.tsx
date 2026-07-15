import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// Shared recharts wrappers for HR dashboards/reports.
// Keeps chart styling consistent and avoids re-inlining SVG per page.

const PRIMARY = '#0d9488';
const PALETTE = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#14b8a6'];

const axisStyle = { fontSize: 11, fill: '#64748b' } as const;

export function LineChartCard({
  title,
  data,
  xKey,
  yKey,
  height = 220,
  color = PRIMARY,
  suffix = '',
}: {
  title: string;
  data: Record<string, any>[];
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  suffix?: string;
}) {
  return (
    <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
      <h3 className="text-sm font-bold text-text-primary mb-4">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              formatter={(v: number) => [`${v}${suffix}`, '']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: 'white', stroke: color, strokeWidth: 2 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BarChartCard({
  title,
  data,
  xKey,
  yKey,
  height = 220,
  color = PRIMARY,
  suffix = '',
}: {
  title: string;
  data: Record<string, any>[];
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  suffix?: string;
}) {
  return (
    <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
      <h3 className="text-sm font-bold text-text-primary mb-4">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              formatter={(v: number) => [`${v}${suffix}`, '']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PieChartCard({
  title,
  data,
  nameKey,
  valueKey,
  height = 220,
}: {
  title: string;
  data: Record<string, any>[];
  nameKey: string;
  valueKey: string;
  height?: number;
}) {
  return (
    <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
      <h3 className="text-sm font-bold text-text-primary mb-4">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={70} innerRadius={38} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            {d[nameKey] ?? '—'}: {d[valueKey]}
          </div>
        ))}
      </div>
    </div>
  );
}
