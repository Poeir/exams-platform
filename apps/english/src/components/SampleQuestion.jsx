import React from 'react';
import { ETIcon } from './Common.jsx';

function CorrectTag() {
  return (
    <span className="et-sample__answer-tag">
      {ETIcon.check}
      Correct answer
    </span>
  );
}

function SampleLetterChoice({ letter, selected }) {
  return (
    <div
      className={`et-sample__opt${selected ? ' et-sample__opt--answer' : ''}`}
      style={{
        minHeight: 88,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 8,
      }}
      aria-label={`Choice ${letter}${selected ? ' (correct answer)' : ''}`}
    >
      <span className="et-sample__opt-bullet" style={{ width: 44, height: 44, fontSize: 20 }}>
        {letter}
      </span>
      {selected && <CorrectTag />}
    </div>
  );
}

export default function SampleQuestion({ prompt, options, lettersOnly = false }) {
  return (
    <div className="et-sample">
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-2)', lineHeight: 1.4, marginBottom: 16 }}>
        {prompt}
      </div>
      {lettersOnly ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 12 }}>
          {options.map((o) => <SampleLetterChoice key={o.l} letter={o.l} selected={o.selected} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((o) => (
            <div
              key={o.l}
              className={`et-sample__opt${o.selected ? ' et-sample__opt--answer' : ''}`}
              aria-label={`Choice ${o.l}${o.selected ? ' (correct answer)' : ''}`}
            >
              <span className="et-sample__opt-bullet">{o.l}</span>
              <span className="et-sample__opt-text">{o.t}</span>
              {o.selected && <CorrectTag />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
