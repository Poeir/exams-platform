import React from 'react';

export default function CountdownCircle({ remaining, total, size = 40, strokeWidth = 3, label = 'seconds' }) {
  const safeTotal = Math.max(total, 0.001);
  const clamped = Math.max(0, Math.min(remaining, safeTotal));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / safeTotal);
  const seconds = Math.ceil(clamped);

  return (
    <div
      role="timer"
      aria-label={`${seconds} ${label} remaining`}
      style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--gf-cloud-3)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={clamped < 5 ? 'var(--gf-warning)' : 'var(--color-primary)'}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 200ms linear, stroke 200ms ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute',
        fontSize: 12, fontWeight: 700,
        color: 'var(--fg-1)',
        fontVariantNumeric: 'tabular-nums',
      }}>{seconds}</span>
    </div>
  );
}
