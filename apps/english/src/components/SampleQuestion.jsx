import React from 'react';
import { ETIcon, ETOption } from './Common.jsx';

export function SamplePlayer({ label = 'Example audio — 0:24', progress = 0 }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--gf-cloud-3)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
      <button className="et-audio__play" type="button" style={{ width: 40, height: 40 }}>
        <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{ETIcon.play}</span>
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
        <div className="et-audio__bar">
          <div className="et-audio__bar-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function SampleLetterChoice({ letter, selected }) {
  return (
    <div
      className={`et-option${selected ? ' et-option--selected' : ''}`}
      style={{
        minHeight: 88,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
      aria-label={`Choice ${letter}`}
    >
      <span
        className="et-option__bullet"
        style={{ width: 44, height: 44, fontSize: 20, fontWeight: 700 }}
      >
        {letter}
      </span>
    </div>
  );
}

export default function SampleQuestion({ eyebrow = 'Sample question', prompt, options, lettersOnly = false }) {
  return (
    <div className="et-card" style={{ padding: 22 }}>
      <div style={{ fontSize: 11, color: 'var(--fg-4)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
        {eyebrow}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', lineHeight: 1.4, marginBottom: 16 }}>
        {prompt}
      </div>
      {lettersOnly ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 12 }}>
          {options.map((o) => <SampleLetterChoice key={o.l} letter={o.l} selected={o.selected} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((o) => <ETOption key={o.l} letter={o.l} text={o.t} selected={o.selected} />)}
        </div>
      )}
    </div>
  );
}
