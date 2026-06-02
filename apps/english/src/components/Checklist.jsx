import React from 'react';
import { ETIcon } from './Common.jsx';

export function CheckItem({ children }) {
  return (
    <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span
        style={{
          width: 18, height: 18, borderRadius: 999,
          background: 'var(--color-primary-soft)',
          color: 'var(--color-primary)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 2,
        }}
      >
        <span style={{ width: 11, height: 11, display: 'inline-flex' }}>{ETIcon.check}</span>
      </span>
      <span style={{ fontSize: 14, color: 'var(--fg-2)', fontWeight: 500, lineHeight: 1.55 }}>
        {children}
      </span>
    </li>
  );
}

export default function Checklist({ items, style }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, ...style }}>
      {items.map((item, i) => <CheckItem key={i}>{item}</CheckItem>)}
    </ul>
  );
}
