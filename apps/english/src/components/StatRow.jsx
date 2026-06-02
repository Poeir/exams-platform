import React from 'react';

export function StatCell({ label, value, padding = '20px 24px', valueSize = 22 }) {
  return (
    <div style={{ padding }}>
      <div style={{ fontSize: 11, color: 'var(--fg-4)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: valueSize, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  );
}

export default function StatRow({ stats, columns, framed = false, valueSize, padding, style }) {
  const cols = columns || stats.length;
  const wrapperStyle = framed
    ? {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        overflow: 'hidden',
        ...style,
      }
    : {
        display: 'flex',
        borderTop: '1px solid var(--gf-cloud-3)',
        borderBottom: '1px solid var(--gf-cloud-3)',
        ...style,
      };
  return (
    <div className={framed ? 'et-card' : ''} style={wrapperStyle}>
      {stats.map((s, i) => (
        <div
          key={i}
          style={{
            flex: framed ? undefined : 1,
            borderRight: i < stats.length - 1 ? '1px solid var(--gf-cloud-3)' : '0',
          }}
        >
          <StatCell label={s.label} value={s.value} valueSize={valueSize} padding={padding} />
        </div>
      ))}
    </div>
  );
}
