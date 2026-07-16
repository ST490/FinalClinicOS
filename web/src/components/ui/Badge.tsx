interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

const variantClasses: Record<string, string> = {
  success: 'bg-success/15 text-success ring-success/20',
  warning: 'bg-warning/15 text-warning ring-warning/20',
  danger: 'bg-danger/15 text-danger ring-danger/20',
  info: 'bg-info/15 text-info ring-info/20',
  neutral: 'bg-text-muted/15 text-text-secondary ring-text-muted/20',
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
