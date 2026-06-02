import React from 'react';
import { ETIcon } from './Common.jsx';

export default function AudioWaveform({
  isPlaying = true,
  progress = 0.62,
  bars = 60,
  currentLabel = '00:38',
  totalLabel = '01:02',
  middleLabel = 'Plays once',
}) {
  return (
    <div style={{ padding: '20px 24px', background: 'var(--gf-soft-cloud-2)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 18 }}>
      <button className="et-audio__play" type="button" style={{ width: 44, height: 44, background: 'var(--fg-1)' }}>
        <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{isPlaying ? ETIcon.pause : ETIcon.play}</span>
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
          {Array.from({ length: bars }).map((_, i) => {
            const played = i / bars < progress;
            const h = 6 + Math.abs(Math.sin(i * 0.6)) * 18 + (i % 7 === 0 ? 4 : 0);
            return (
              <span
                key={i}
                style={{
                  flex: 1, height: h,
                  background: played ? 'var(--color-primary)' : 'var(--gf-smoke-4)',
                  borderRadius: 2,
                }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--fg-3)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          <span>{currentLabel}</span>
          <span style={{ color: 'var(--fg-4)' }}>{middleLabel}</span>
          <span>{totalLabel}</span>
        </div>
      </div>
    </div>
  );
}
