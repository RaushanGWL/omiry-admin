interface StatusBadgeProps {
  label: string;
  variant: 'published' | 'draft' | 'active' | 'inactive' | 'new' | 'read' | 'resolved' | 'featured';
}

const variantStyles: Record<string, { bg: string; color: string }> = {
  published: { bg: '#dcfce7', color: '#16a34a' },
  draft:     { bg: '#fef9c3', color: '#a16207' },
  active:    { bg: '#dbeafe', color: '#2563eb' },
  inactive:  { bg: '#f3f4f6', color: '#6b7280' },
  new:       { bg: '#ede9fe', color: '#7c3aed' },
  read:      { bg: '#f0fdf4', color: '#15803d' },
  resolved:  { bg: '#f0f9ff', color: '#0369a1' },
  featured:  { bg: '#fef3c7', color: '#d97706' },
};

export const StatusBadge = ({ label, variant }: StatusBadgeProps) => {
  const style = variantStyles[variant] ?? variantStyles.inactive;
  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  );
};
