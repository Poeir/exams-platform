import React from 'react';

export function PartListItem({ part }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '13px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--fg-4)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', width: 18, flexShrink: 0 }}>
        {String(part.id).padStart(2, '0')}
      </span>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-1)', flex: 1 }}>{part.title}</span>
      <span style={{ fontSize: 12, color: 'var(--fg-4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {part.qs} Qs
      </span>
    </div>
  );
}

export default function StructureSection({ icon, label, summary, parts, accent }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: `2px solid ${accent}`, marginBottom: 4 }}>
        <span style={{ width: 13, height: 13, display: 'inline-flex', color: accent, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>
          {label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)' }}>{summary}</span>
      </div>
      {parts.map((p) => <PartListItem key={p.id} part={p} />)}
    </div>
  );
}
