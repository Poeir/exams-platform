import React from 'react';

const BAND_COLORS = {
  A: { bg: 'var(--gf-success-soft)', fg: 'var(--gf-success-dark)' },
  B: { bg: 'var(--color-primary-soft)', fg: 'var(--color-primary)' },
  C: { bg: 'var(--gf-cloud-3)', fg: 'var(--fg-2)' },
  D: { bg: '#FFEAE5', fg: 'var(--gf-validation)' },
};

export function BandChip({ band }) {
  const colors = BAND_COLORS[band] || { bg: 'var(--gf-cloud-3)', fg: 'var(--fg-2)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: 8,
      background: colors.bg, color: colors.fg,
      fontWeight: 700, fontSize: 13,
    }}>
      {band}
    </span>
  );
}

export function SectionBar({ label, value, max }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>{label}</span>
        <span style={{ fontSize: 14, color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          <strong style={{ color: 'var(--fg-1)', fontWeight: 700, fontSize: 18 }}>{value}</strong>
          <span style={{ color: 'var(--fg-4)', marginLeft: 4 }}>/ {max}</span>
        </span>
      </div>
      <div style={{ height: 8, background: 'var(--gf-cloud-3)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 999 }} />
      </div>
    </div>
  );
}

export function PartScoreCell({ part, dark = false, isLast = false }) {
  const pct = Math.round((part.correct / part.total) * 100);
  return (
    <div style={{ padding: '16px 12px', borderRight: isLast ? '0' : '1px solid var(--gf-smoke-4)' }}>
      <div style={{ fontSize: 11, color: 'var(--fg-4)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>P{part.id}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 12, minHeight: 32, lineHeight: 1.3 }}>{part.title}</div>
      <div style={{ position: 'relative', height: 60, background: 'var(--gf-soft-cloud-2)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, background: dark ? 'var(--fg-1)' : 'var(--color-primary)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600 }}>{part.correct}/{part.total}</span>
      </div>
    </div>
  );
}
