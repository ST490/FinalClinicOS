interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

const variantClasses: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  danger: 'bg-red-50 text-red-700 ring-red-600/10',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/10',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10',
};

export default function Badge({ variant = 'neutral', children, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium ring-1 ring-inset rounded-full
        ${variantClasses[variant]}
        ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'}
      `}
    >
      {children}
    </span>
  );
}
