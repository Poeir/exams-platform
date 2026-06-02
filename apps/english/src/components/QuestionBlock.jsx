import React from 'react';
import { ETIcon, ETOption } from './Common.jsx';
import { getOptionLetters } from '../data/exam.js';
import { useExam } from '../state/ExamContext.jsx';

function LetterChoice({ letter, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`et-option${selected ? ' et-option--selected' : ''}`}
      style={{
        width: '100%',
        minHeight: 88,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        font: 'inherit',
        gap: 6,
      }}
      aria-label={`Choice ${letter}`}
    >
      <span
        className="et-option__bullet"
        style={{
          width: 44,
          height: 44,
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        {letter}
      </span>
    </button>
  );
}

export default function QuestionBlock({ item, number, columns = 1, lettersOnly = false, lettersOnlyPrompt, showFlag = true }) {
  const { answers, flagged, answer, toggleFlag } = useExam();
  const letters = getOptionLetters(item);
  const selected = answers[item.id];
  const isFlagged = flagged.has(item.id);

  const stemText = lettersOnly
    ? (lettersOnlyPrompt || 'Listen and choose the best answer.')
    : item.stem;

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)', lineHeight: 1.5, margin: 0 }}>
          {number != null && <>{number}. </>}
          {stemText}
        </p>
        {showFlag && (
          <button
            className="et-btn et-btn--ghost et-btn--sm"
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleFlag(item.id); }}
            style={{ gap: 6, flexShrink: 0, color: isFlagged ? 'var(--gf-warning)' : 'var(--fg-3)' }}
          >
            <span style={{ width: 14, height: 14, display: 'inline-flex' }}>
              {isFlagged ? ETIcon.flagFilled : ETIcon.flag}
            </span>
            {isFlagged ? 'Flagged' : 'Flag'}
          </button>
        )}
      </div>
      {lettersOnly ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${letters.length}, 1fr)`, gap: 12 }}>
          {letters.map((l) => (
            <LetterChoice
              key={l}
              letter={l}
              selected={selected === l}
              onClick={(e) => { e.stopPropagation(); answer(item.id, l); }}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8 }}>
          {letters.map((l) => (
            <ETOption
              key={l}
              letter={l}
              text={item.options[l]}
              selected={selected === l}
              onClick={(e) => { e.stopPropagation(); answer(item.id, l); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
