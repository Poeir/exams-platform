import React from 'react';
import { ETIcon, ETBtn, ETTopbar } from '../components/Common.jsx';
import { useExam, VERSIONS } from '../state/ExamContext.jsx';
import { partsBySection } from '../data/exam.js';

const PART_BLURBS = {
  1: 'Listen to a description and choose the photograph it best matches.',
  2: 'Listen to a question and choose the most appropriate response.',
  3: 'Listen to short conversations between 2–3 speakers and answer questions.',
  4: 'Listen to a single-speaker announcement or talk and answer questions.',
  5: 'Choose the word or phrase that best completes the sentence.',
  6: 'Choose the answer that uses correct grammar and structure.',
  7: 'Read single and paired passages and answer questions about them.',
};

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--fg-3)',
      }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.01em', lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}

function PartRow({ index, title, blurb, qs }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 18px', borderTop: '1px solid var(--gf-cloud-3)',
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        background: 'var(--gf-soft-cloud-2, #F5F5F8)',
        color: 'var(--fg-3)',
        fontSize: 12, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>{index}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 4 }}>
          Part {index} · {title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--fg-3)', fontWeight: 500, lineHeight: 1.45 }}>
          {blurb}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>{qs} Qs</div>
      </div>
    </div>
  );
}

function SectionCard({ accent, icon, label, summary, parts }) {
  const isPrimary = accent === 'primary';
  return (
    <div style={{
      border: '1px solid var(--gf-cloud-3)',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--bg-surface, #fff)',
      marginBottom: 18,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 18px',
        background: isPrimary ? 'var(--color-primary-tint)' : 'var(--gf-soft-cloud-2, #F5F5F8)',
      }}>
        <span style={{ width: 16, height: 16, display: 'inline-flex', color: isPrimary ? 'var(--color-primary)' : 'var(--fg-2)', flexShrink: 0 }}>
          {icon}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: isPrimary ? 'var(--color-primary)' : 'var(--fg-2)',
        }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>
          {summary}
        </span>
      </div>
      {parts.map((p, i) => (
        <PartRow
          key={p.number}
          index={p.number}
          title={p.title}
          blurb={PART_BLURBS[p.number] || ''}
          qs={p.totalItems}
        />
      ))}
    </div>
  );
}

export default function Landing({ onExit }) {
  const { exam, version } = useExam();
  const isShort = version === 'short';

  const listeningParts = exam ? partsBySection(exam, 'listening') : [];
  const readingParts   = exam ? partsBySection(exam, 'reading')   : [];

  const listeningQs  = listeningParts.reduce((n, p) => n + p.totalItems, 0);
  const readingQs    = readingParts.reduce((n, p) => n + p.totalItems, 0);
  const listeningMin = listeningParts.reduce((n, p) => n + (p.timeMin || 0), 0);
  const readingMin   = readingParts.reduce((n, p) => n + (p.timeMin || 0), 0);

  const totalQs   = isShort ? readingQs : listeningQs + readingQs;
  // The paper's own time limit wins — VERSIONS only backstops papers seeded
  // without one (mirrors examTotalSeconds in ExamContext).
  const minutes   = exam?.meta?.time_limit_min || (VERSIONS[isShort ? 'short' : 'full'] || VERSIONS.full).minutes;

  return (
    <div className="et et-screen et-screen--white">
      <ETTopbar
        crumbs={[{ text: 'Overview', strong: true }]}
        onExit={onExit}
      />

      <div className="et-landing-split" style={{ flex: 1, minHeight: 0 }}>
      {/* LEFT — branding + CTA */}
      <div className="et-landing-split__left">
        <div className="et-landing-split__leftInner">
          <div>
            <h1 className="et-display" style={{ fontSize: 64, letterSpacing: '-0.025em', lineHeight: 1.02, margin: 0, marginBottom: 18 }}>
              English<br />Proficiency<br />Test.
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--fg-2)', fontWeight: 500, margin: 0, maxWidth: 440 }}>
              A workplace assessment of your spoken and written English. Take a few
              quiet minutes, and you're ready to begin.
            </p>
          </div>

          <div style={{
            borderTop: '1px solid rgba(0,0,0,0.10)',
            borderBottom: '1px solid rgba(0,0,0,0.10)',
            padding: '22px 0',
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18,
          }}>
            <Stat label="Questions" value={totalQs || '—'} />
            <Stat label="Duration" value={`${minutes}m`} />
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <ETBtn kind="primary" size="lg" iconRight={ETIcon.arrowRight}>Start the test</ETBtn>
          </div>
        </div>
      </div>

      {/* RIGHT — test structure */}
      <div className="et-landing-split__right">
        <div className="et-landing-split__rightInner">
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 22, gap: 12,
          }}>
            <h2 className="et-display" style={{ fontSize: 22, letterSpacing: '-0.01em', margin: 0 }}>
              Test structure
            </h2>
            <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 600 }}>
              Total · {totalQs} questions
            </span>
          </div>

          {!isShort && (
            <SectionCard
              accent="primary"
              icon={ETIcon.headphones}
              label={`Section 1 · Listening`}
              summary={`${listeningQs} Qs · ${listeningMin || '—'} min`}
              parts={listeningParts}
            />
          )}
          <SectionCard
            accent="muted"
            icon={ETIcon.book}
            label={isShort ? 'Reading' : 'Section 2 · Reading'}
            summary={`${readingQs} Qs · ${readingMin || '—'} min`}
            parts={readingParts}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
