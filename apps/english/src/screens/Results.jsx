import React, { useEffect, useState } from 'react';
import { ETIcon, ETBtn } from '../components/Common.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import { scorePaper } from '../data/examRepo.js';
import { useExam } from '../state/ExamContext.jsx';

// Bands are on the 0–100 normalized scale (was 0–50 raw items). Mapping mirrors
// the original boundaries: 15/24/33/41 of 50 ≈ 30/48/66/82 of 100.
const LEVEL_GUIDE = [
  {
    level: 1, min: 0, max: 30, label: 'Novice',
    desc: 'The test taker has a very limited understanding of English. They may recognize some basic words and simple sentences, but they often have difficulty understanding conversations, short texts, details, and main ideas.',
    advice: 'At this level, the learner should focus on basic vocabulary, simple grammar, common sentence patterns, and short listening practice.',
  },
  {
    level: 2, min: 31, max: 48, label: 'Beginner',
    desc: 'The test taker has a basic understanding of English. They can understand simple questions, short sentences, and familiar topics, but they may still struggle with longer conversations, detailed information, and unfamiliar vocabulary.',
    advice: 'At this level, the learner should continue building vocabulary, improving basic grammar, and practicing listening and reading for main ideas.',
  },
  {
    level: 3, min: 49, max: 66, label: 'Intermediate',
    desc: 'The test taker can understand the main ideas of common conversations, announcements, emails, and short to medium-length texts. However, they may still miss complex details, implied meanings, tone, or more advanced vocabulary.',
    advice: 'At this level, the learner can use English in many general situations, but should continue improving accuracy, comprehension, and confidence.',
  },
  {
    level: 4, min: 67, max: 82, label: 'Advanced',
    desc: 'The test taker has a good understanding of English. They can understand conversations, messages, announcements, and detailed texts quite well. They can usually identify main ideas, important details, reasons, and the speaker’s or writer’s purpose.',
    advice: 'At this level, the learner can handle English with confidence, although highly complex language, indirect meanings, and advanced vocabulary may still be challenging.',
  },
  {
    level: 5, min: 83, max: 100, label: 'Expert',
    desc: 'The test taker has a strong understanding of English. They can understand complex texts, detailed information, reasoning, implied meanings, tone, and the speaker’s or writer’s intention with high accuracy.',
    advice: 'At this level, the learner is ready to handle situations that require advanced English comprehension and can continue improving fluency, advanced vocabulary, and complex communication skills.',
  },
];

// The short 20-item placement paper bands on RAW points (not the normalized
// 0–100 scale): 0–6 Beginner, 7–15 Intermediate, 16–20 Advanced — the
// assessment team's mapping, mirrored server-side in server/src/cefr.js.
const SHORT_LEVEL_GUIDE = [
  {
    level: 1, min: 0, max: 6, label: 'Beginner',
    desc: 'The test taker has a basic, limited command of English. They can understand some everyday words and very simple sentences, but workplace emails, instructions, and longer sentences are still difficult.',
    advice: 'At this level, the learner should focus on high-frequency vocabulary, simple tenses, and short everyday sentences before moving on to workplace English.',
  },
  {
    level: 2, min: 7, max: 15, label: 'Intermediate',
    desc: 'The test taker can handle everyday and routine workplace English. They understand short emails, notices, and common grammar, but nuanced wording, formal register, and complex sentences can still cause problems.',
    advice: 'At this level, the learner should practice reading real workplace texts and strengthen tense, modal, and conditional usage to become more accurate.',
  },
  {
    level: 3, min: 16, max: 20, label: 'Advanced',
    desc: 'The test taker has a strong command of English, including formal register, nuanced inference, and advanced grammar. They can read workplace memos and policy documents with high accuracy.',
    advice: 'At this level, the learner is ready for demanding English-language work and can keep refining fluency, advanced vocabulary, and professional writing.',
  },
];

const MAX_SCORE = 100;

function normalizeScore(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * MAX_SCORE);
}

function pctOf(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

function levelFor(guide, score) {
  return guide.find((l) => score >= l.min && score <= l.max) || guide[0];
}

// Fallback identity for anonymous walk-ins (no parent hand-off, so no name /
// role / avatar in the launch URL). Parent-launched sessions override these
// with the values carried client-side through ExamContext (launchName /
// launchRole / launchAvatarUrl).
const DEFAULT_USER = {
  name: 'Test Candidate',
  position: 'Role',
  avatarUrl: null,
};

function getInitials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase() || '?';
}

// Circular progress ring. The SVG is rotated so the arc starts at 12 o'clock;
// center content is overlaid (and counter-rotated by living outside the svg).
function CircularGauge({
  pct, size = 240, stroke = 16,
  color = 'var(--color-primary)', track = 'var(--color-primary-soft)',
  children,
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {children}
      </div>
    </div>
  );
}

// White card with the orange accent-bar header used by every panel on the
// right column of the certificate layout. `meta` is the right-aligned text.
function PanelCard({ title, meta, children }) {
  return (
    <section style={{
      background: '#fff', border: '1px solid var(--gf-cloud-3)', borderRadius: 16,
      boxShadow: '0 1px 4px rgba(16, 24, 40, 0.04)',
      padding: '20px 24px 24px',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginBottom: 18,
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span aria-hidden="true" style={{
            width: 3, height: 16, borderRadius: 2, flexShrink: 0,
            background: 'var(--color-primary)',
          }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>{title}</span>
        </span>
        {meta && (
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-3)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {meta}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function CertificateHero({ user, activeLevel, score, maxScore, pct, issuedAt }) {
  const initials = getInitials(user.name);
  const issued = (issuedAt ? new Date(issuedAt) : new Date())
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* avatar */}
      <div
        aria-hidden="true"
        style={{
          width: 84, height: 84, borderRadius: 999,
          background: user.avatarUrl
            ? `center/cover no-repeat url(${user.avatarUrl})`
            : 'var(--color-primary-soft)',
          color: 'var(--color-primary)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 28, letterSpacing: '0.02em',
          boxShadow: '0 0 0 6px var(--color-primary-tint), 0 0 34px 4px var(--color-primary-soft)',
        }}
      >
        {!user.avatarUrl && initials}
      </div>

      <Eyebrow color="var(--color-primary)" style={{ marginTop: 18, marginBottom: 8 }}>
        Result certificate
      </Eyebrow>
      <h1 className="et-display" style={{ fontSize: 34, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
        {user.name}
      </h1>
      <div style={{ marginTop: 6, fontSize: 13.5, color: 'var(--fg-3)', fontWeight: 600 }}>
        {user.position}
      </div>

      {/* issued — kept subtle */}
      <div style={{
        marginTop: 12,
        fontSize: 12, color: 'var(--fg-4)', fontWeight: 500,
      }}>
        Issued on {issued}
      </div>

      {/* score gauge */}
      <div style={{ marginTop: 30, marginBottom: 26 }}>
        <CircularGauge pct={pct} size={188} stroke={14}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: 2,
          }}>Score</span>
          <span style={{
            fontSize: 48, fontWeight: 700, color: 'var(--fg-1)',
            letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>{score}</span>
          <span style={{ fontSize: 13.5, color: 'var(--fg-3)', fontWeight: 600, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            / {maxScore}
          </span>
        </CircularGauge>
      </div>

      {/* band pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '9px 20px', borderRadius: 999,
        background: 'var(--color-primary)', color: '#fff',
        fontWeight: 700, fontSize: 14,
      }}>
        <span style={{ width: 15, height: 15, display: 'inline-flex' }}>{ETIcon.trophy}</span>
        Level {activeLevel.level} · {activeLevel.label}
      </div>
    </div>
  );
}

function BandReference({ guide, activeLevel }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(96px, 1fr))`,
      gap: 10,
    }}>
        {guide.map((l) => {
          const state = l.level === activeLevel.level
            ? 'active'
            : l.level < activeLevel.level
              ? 'reached'
              : 'locked';
          const isActive = state === 'active';
          const isLocked = state === 'locked';
          const badge = {
            active:  { bg: 'var(--color-primary)',      fg: '#fff' },
            reached: { bg: 'var(--color-primary-soft)', fg: 'var(--color-primary)' },
            locked:  { bg: 'var(--gf-cloud-3)',         fg: 'var(--fg-4)' },
          }[state];
          return (
            <div
              key={l.level}
              style={{
                padding: '14px 8px', borderRadius: 12, textAlign: 'center',
                background: '#fff',
                border: isActive ? '1.5px solid var(--color-primary)' : '1px solid var(--gf-cloud-3)',
                boxShadow: isActive ? '0 2px 10px var(--color-primary-soft)' : 'none',
                opacity: isLocked ? 0.7 : 1,
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 8, marginBottom: 8,
                background: badge.bg, color: badge.fg,
                fontWeight: 700, fontSize: 13,
              }}>
                {l.level}
              </span>
              <div style={{
                fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                color: isLocked ? 'var(--fg-4)' : 'var(--fg-3)', marginBottom: 4,
              }}>
                {l.min}–{l.max}
              </div>
              <div style={{
                fontSize: 12, fontWeight: 700, lineHeight: 1.3,
                color: isActive ? 'var(--color-primary)' : isLocked ? 'var(--fg-4)' : 'var(--fg-2)',
              }}>
                {l.label}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function SectionGauges({ sections }) {
  // Deliberately off-brand hues so the gauges read as data, not actions —
  // and far apart from each other: deep blue (venio) for listening,
  // teal-green (DS success) for reading.
  const palette = [
    { color: 'var(--brand-venio)', track: '#D6E4FE' },
    { color: 'var(--gf-success)',  track: 'var(--gf-success-soft)' },
  ];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 16,
    }}>
      {sections.map((s, i) => {
        const tone = palette[i % palette.length];
        return (
          <div key={s.key} style={{
            background: '#fff', border: '1px solid var(--gf-cloud-3)', borderRadius: 12,
            padding: '26px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <CircularGauge pct={s.pct} size={104} stroke={10} color={tone.color} track={tone.track}>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>
                {s.pct}%
              </span>
            </CircularGauge>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 600, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                {s.correct} / {s.total} correct
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// The full certificate body — two-column dashboard: certificate card on the
// left, panel cards (section breakdown / score band reference / level
// explanation) on the right. Shared between the candidate's own Results screen
// and the parent-site read-only view (src/screens/ResultViewer.jsx) so both
// render the exact same layout. `skills` is the scored-skills object the
// server returns ({ listening, vocabulary, grammar, reading, total }).
// `variant` picks the score-band guide: the full paper bands on the normalized
// 0–100 score, the short placement paper on raw points out of 20.
export function ResultCertificate({ user, skills, issuedAt, variant = 'full' }) {
  const isShort = variant === 'short';
  const guide = isShort ? SHORT_LEVEL_GUIDE : LEVEL_GUIDE;
  const score = isShort
    ? skills.total.correct
    : normalizeScore(skills.total.correct, skills.total.total);
  const maxScore = isShort ? skills.total.total : MAX_SCORE;
  const activeLevel = levelFor(guide, score);
  const levelText = `Level ${activeLevel.level} · ${activeLevel.label}`;

  // Two-section view for the breakdown gauges. The reading section rolls up
  // vocabulary + grammar + reading comprehension.
  const readingSection = {
    correct: skills.vocabulary.correct + skills.grammar.correct + skills.reading.correct,
    total:   skills.vocabulary.total   + skills.grammar.total   + skills.reading.total,
  };
  const sections = [
    { key: 'listening', label: 'Listening', correct: skills.listening.correct, total: skills.listening.total },
    { key: 'reading',   label: 'Reading',   correct: readingSection.correct,   total: readingSection.total },
  ]
    .filter((s) => s.total > 0)
    .map((s) => ({ ...s, pct: pctOf(s.correct, s.total) }));

  return (
    <div className="et-cert-layout">
      {/* certificate card */}
      <aside className="et-cert-card">
        <CertificateHero
          user={user}
          activeLevel={activeLevel}
          score={score}
          maxScore={maxScore}
          pct={pctOf(skills.total.correct, skills.total.total)}
          issuedAt={issuedAt}
        />
      </aside>

      {/* detail panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <PanelCard title="Score Band Reference" meta={levelText}>
          <BandReference guide={guide} activeLevel={activeLevel} />
        </PanelCard>

        <PanelCard
          title="Section breakdown"
          meta={`${skills.total.correct} / ${skills.total.total} correct`}
        >
          <SectionGauges sections={sections} />
        </PanelCard>

        <PanelCard title={`What this level means · ${levelText}`}>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--fg-2)', fontWeight: 500, margin: 0, marginBottom: 10 }}>
            {activeLevel.desc}
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--fg-2)', fontWeight: 500, margin: 0 }}>
            {activeLevel.advice}
          </p>
        </PanelCard>
      </div>
    </div>
  );
}

export default function Results() {
  const { exam, answers, attemptId, submitFinal, version, launchAvatarUrl, launchName, launchRole } = useExam();
  // Scoring happens on the server so the answer key never reaches the client.
  // In session mode (parent-launched), submitFinal hits /attempts/:id/submit —
  // server snapshots onto the attempt row and pushes to the parent's callback.
  // Otherwise fall back to the stateless /papers/:id/score endpoint.
  const [result, setResult] = useState(null);
  const [scoreError, setScoreError] = useState(null);
  const paperId = exam?.meta?.id;

  useEffect(() => {
    if (!paperId) return undefined;
    let alive = true;
    setScoreError(null);
    const fetcher = attemptId
      ? submitFinal()
      : scorePaper(paperId, answers);
    fetcher
      .then((r) => { if (alive && r) setResult(r); })
      .catch((e) => { if (alive) setScoreError(e); });
    return () => { alive = false; };
    // answers are final on this screen; re-score only if the paper changes.
  }, [paperId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (scoreError) {
    return (
      <div className="et et-screen et-screen--white">
        <div className="et-results et-results--dim"><div className="et-results__inner" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--fg-2)', fontWeight: 600 }}>
            Couldn’t calculate your result. Please try again.
          </p>
          <ETBtn kind="secondary" onClick={() => window.location.reload()}>Retry</ETBtn>
        </div></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="et et-screen et-screen--white">
        <div className="et-results et-results--dim"><div className="et-results__inner" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--fg-3)', fontWeight: 600 }}>Calculating your result…</p>
        </div></div>
      </div>
    );
  }

  return (
    <div className="et et-screen et-screen--white">
      <div className="et-results et-results--dim">
        <div className="et-results__inner">
          <ResultCertificate
            user={{
              name: launchName || DEFAULT_USER.name,
              position: launchRole || DEFAULT_USER.position,
              avatarUrl: launchAvatarUrl || DEFAULT_USER.avatarUrl,
            }}
            skills={result.skills}
            variant={version}
          />
        </div>
      </div>
    </div>
  );
}
