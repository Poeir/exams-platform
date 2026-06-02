import React from 'react';

export default function Eyebrow({ brand = false, color, style, children }) {
  const cls = ['et-eyebrow'];
  if (brand) cls.push('et-eyebrow--brand');
  return (
    <div className={cls.join(' ')} style={{ ...(color ? { color } : null), ...style }}>
      {children}
    </div>
  );
}
