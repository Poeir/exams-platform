import React, { useState } from 'react';
import { ETIcon, ETBtn, ETTopbar } from '../components/Common.jsx';
import { useExam, VERSIONS } from '../state/ExamContext.jsx';
import { partsBySection } from '../data/exam.js';
import { withBase } from '../lib/base.js';

// Hero image for the left pane. If the asset is ever missing, LandingImage
// falls back to a placeholder so the layout stays intact.
const LANDING_IMAGE_SRC = withBase('/landing_pic.png');

function LandingImage() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="et-landing-split__imgPlaceholder">
        <span style={{ width: 44, height: 44, display: 'inline-flex' }}>{ETIcon.photo}</span>
        <span>Add image at public/landing_pic.png</span>
      </div>
    );
  }
  return (
    <img
      className="et-landing-split__img"
      src={LANDING_IMAGE_SRC}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

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

function PartRow({ index, heading, qs }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 18px', borderTop: '1px solid var(--gf-cloud-3)',
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        background: 'var(--gf-soft-cloud-2, #F5F5F8)',
        color: 'var(--fg-3)',
        fontSize: 12, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{index}</span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>
        {heading}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>{qs} Qs</div>
      </div>
    </div>
  );
}

function SectionCard({ accent, icon, label, summary, parts, isShort = false }) {
  const isPrimary = accent === 'primary';
  return (
    <div style={{
      border: '1px solid var(--gf-cloud-3)',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--bg-surface, #fff)',
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
      {parts.map((p) => (
        <PartRow
          key={p.number}
          index={p.number}
          heading={isShort ? p.title : `Part ${p.number} · ${p.title}`}
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

  // Short paper overview: collapse the per-band parts into one row per skill
  // (Grammar / Reading) — the CEFR ramp stays invisible to the candidate.
  const shortRows = [];
  if (isShort) {
    for (const p of readingParts) {
      const row = shortRows.find((r) => r.skill === p.skill);
      if (row) row.totalItems += p.totalItems;
      else shortRows.push({ number: shortRows.length + 1, title: p.title, skill: p.skill, totalItems: p.totalItems });
    }
  }

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
      {/* LEFT — image */}
      <div className="et-landing-split__left">
        <LandingImage />
      </div>

      {/* RIGHT — all information + test structure */}
      <div className="et-landing-split__right">
        <div className="et-landing-split__rightInner">
          {/* Top — title, blurb, stats */}
          <div>
            <h1 className="et-display" style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1.08, margin: 0, marginBottom: 14 }}>
              {isShort ? 'English Proficiency Test' : 'English Proficiency Test'}
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--fg-2)', fontWeight: 500, margin: 0, marginBottom: 22, maxWidth: 520 }}>
              {isShort
                ? 'A quick placement check of your written English — grammar and workplace reading. Take a few quiet minutes, and you\'re ready to begin.'
                : 'A workplace assessment of your spoken and written English. Take a few quiet minutes, and you\'re ready to begin.'}
            </p>

            <div style={{
              maxWidth: 420,
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18,
            }}>
              <Stat label="Questions" value={totalQs || '—'} />
              <Stat label="Duration" value={`${minutes}m`} />
            </div>
          </div>

          {/* Middle — test structure (unchanged table) */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 18, gap: 12,
            }}>
              <h2 className="et-display" style={{ fontSize: 22, letterSpacing: '-0.01em', margin: 0 }}>
                Test structure
              </h2>
            </div>

            {isShort ? (
              <SectionCard
                accent="muted"
                icon={ETIcon.book}
                label="Grammar & Reading"
                summary={`${readingQs} Qs `}
                parts={shortRows}
                isShort
              />
            ) : (
              <div className="et-landing-structure">
                <SectionCard
                  accent="muted"
                  icon={ETIcon.headphones}
                  label={`Section 1 · Listening`}
                  summary={`${listeningQs} Qs`}
                  parts={listeningParts}
                />
                <SectionCard
                  accent="muted"
                  icon={ETIcon.book}
                  label={`Section 2 · Reading`}
                  summary={`${readingQs} Qs`}
                  parts={readingParts}
                />
              </div>
            )}
          </div>

          {/* Bottom — full-width CTA */}
          <ETBtn kind="primary" size="lg" iconRight={ETIcon.arrowRight} style={{ width: '100%', justifyContent: 'center' }}>Start the test</ETBtn>
        </div>
      </div>
      </div>
    </div>
  );
}
