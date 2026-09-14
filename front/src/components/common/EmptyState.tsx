import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  padding?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  padding = '40px 20px',
}) => {
  return (
    <div style={{
      padding,
      textAlign: 'center',
      color: 'var(--text-subtle)',
      fontSize: '0.85rem'
    }}>
      <div style={{ opacity: 0.3, marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
        {icon}
      </div>
      <p style={{ fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0', fontSize: '0.9rem' }}>
        {title}
      </p>
      {description && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      {action && (
        <div style={{ marginTop: '14px' }}>
          {action}
        </div>
      )}
    </div>
  );
};
