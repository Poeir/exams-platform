import React from 'react';

export default function Avatar({ initials = 'SK', bg = '#FFD9B8', color = '#A35112', style }) {
  return (
    <div className="et-avatar" style={{ background: bg, color, ...style }}>
      {initials}
    </div>
  );
}
