import React from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  opacity?: number;
  style?: React.CSSProperties;
}

export const TabButton: React.FC<TabButtonProps> = ({
  active,
  onClick,
  icon,
  label,
  badge,
  disabled,
  opacity,
  style: customStyle,
}) => {
  return (
    <button
      type="button"
      className={`tab-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        opacity: opacity !== undefined ? opacity : disabled ? 0.6 : 1,
        ...customStyle,
      }}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && (
        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({badge})</span>
      )}
    </button>
  );
};
