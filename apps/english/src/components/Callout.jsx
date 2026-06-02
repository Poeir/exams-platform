import React from 'react';
import { ETIcon } from './Common.jsx';

const TONES = {
  warning: {
    bg: '#FFF8EE',
    border: '#FFE3B8',
    iconColor: '#B0651A',
    textColor: '#5A3406',
  },
  info: {
    bg: 'var(--color-primary-tint)',
    border: 'var(--color-primary-soft)',
    iconColor: 'var(--color-primary)',
    textColor: 'var(--fg-2)',
  },
  neutral: {
    bg: '#fff',
    border: 'var(--gf-smoke-4)',
    iconColor: 'var(--fg-3)',
    textColor: 'var(--fg-3)',
    dashed: true,
  },
};

export default function Callout({ tone = 'warning', icon = ETIcon.info, style, children }) {
  const t = TONES[tone] || TONES.warning;
  return (
    <div
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        padding: '14px 18px',
        background: t.bg,
        border: `1px ${t.dashed ? 'dashed' : 'solid'} ${t.border}`,
        borderRadius: 10,
        ...style,
      }}
    >
      {icon && (
        <span style={{ width: 18, height: 18, display: 'inline-flex', color: t.iconColor, flexShrink: 0, marginTop: 1 }}>
          {icon}
        </span>
      )}
      <div style={{ fontSize: 13, color: t.textColor, fontWeight: 500, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}
