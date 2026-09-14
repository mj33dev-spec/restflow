import React from 'react';

interface MethodBadgeProps {
  method: string;
  fontSize?: string;
  padding?: string;
}

export const MethodBadge: React.FC<MethodBadgeProps> = ({
  method,
  fontSize,
  padding,
}) => {
  const upperMethod = (method || 'GET').toUpperCase();

  const style: React.CSSProperties = {};
  if (fontSize) style.fontSize = fontSize;
  if (padding) style.padding = padding;

  return (
    <span className={`badge-method ${upperMethod}`} style={style}>
      {upperMethod}
    </span>
  );
};
