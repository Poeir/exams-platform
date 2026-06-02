import React, { useState, useEffect, useMemo, useRef } from 'react';
import Landing from './screens/Landing.jsx';
import AudioCheck from './screens/AudioCheck.jsx';
import { InstructionsListening, InstructionsReading } from './screens/Instructions.jsx';
import Listening from './screens/Listening.jsx';
import EndOfListening from './screens/EndOfListening.jsx';
import Reading from './screens/Reading.jsx';
import Results from './screens/Results.jsx';
import { TweaksPanel, TweakSection, TweakRadio, useTweaks } from './components/TweaksPanel.jsx';
import { ExamProvider, useExam, SHORT_ENABLED } from './state/ExamContext.jsx';
import { partsBySection } from './data/exam.js';
import AdminApp from './admin/AdminApp.jsx';
import ResultViewer from './screens/ResultViewer.jsx';
import { withBase, stripBase } from './lib/base.js';

const BRANDS = {
  '#F87014': { primary: '#F87014', hover: '#DD6010', pressed: '#BC500C', soft: '#FFEEDF', tint: '#FFF6EE', ring: 'rgba(248,112,20,0.20)' },
  '#116DFC': { primary: '#116DFC', hover: '#0A5AE0', pressed: '#0047C2', soft: '#B8D3FE', tint: '#E7F0FF', ring: 'rgba(17,109,252,0.20)' },
  '#F05B2F': { primary: '#F05B2F', hover: '#DA4815', pressed: '#C03D0E', soft: '#FFE1CC', tint: '#FFF3EC', ring: 'rgba(240,91,47,0.20)' },
  '#EB1C26': { primary: '#EB1C26', hover: '#C9141D', pressed: '#A80B14', soft: '#FFBEB2', tint: '#FFEAE5', ring: 'rgba(235,28,38,0.20)' },
};

function buildCSS({ brand, atmosphere, surface }) {
  const b = BRANDS[Array.isArray(brand) ? brand[0] : brand] || BRANDS['#F87014'];

  let css = `
    .et {
      --color-primary:         ${b.primary};
      --color-primary-hover:   ${b.hover};
      --color-primary-pressed: ${b.pressed};
      --color-primary-soft:    ${b.soft};
      --color-primary-tint:    ${b.tint};
      --border-focus:          ${b.primary};
      --focus-ring:            0 0 0 3px ${b.ring};
    }
  `;

  if (atmosphere === 'light') {
    css += `
      :root {
        --bg-app: #FFFFFF;
        --gf-soft-cloud-2: #F5F5F8;
        --gf-cloud-3: #E6E6F0;
      }
      .et-screen  { background: #FFFFFF !important; }
      .et-card    { box-shadow: none !important; border-color: #E0E0EC !important; }
    `;
  } else if (atmosphere === 'dark') {
    css += `
      :root {
        --bg-app:          #111115;
        --bg-surface:      #1E1E26;
        --bg-hover:        #25252F;
        --fg-1:            #F0F0F8;
        --fg-2:            #C4C4D8;
        --fg-3:            #888898;
        --fg-4:            #56566A;
        --gf-cloud-3:      #282833;
        --gf-smoke-4:      #30303C;
        --gf-soft-cloud-2: #191920;
        --gf-silver-5:     #38384A;
        --border-default:  #30303C;
      }
      .et-screen           { background: #1A1A22 !important; }
      .et-screen--white    { background: #1E1E26 !important; }
      .et-topbar           { background: #1E1E26 !important; border-color: #282833 !important; }
      .et-footbar          { background: #1E1E26 !important; border-color: #282833 !important; }
      .et-card             { background: #23232E !important; border-color: #282833 !important; box-shadow: none !important; }
      .et-option           { background: #23232E !important; border-color: #30303C !important; }
      .et-option:hover     { background: #28283A !important; }
      .et-btn--secondary   { background: #23232E !important; border-color: #38384A !important; color: #C4C4D8 !important; }
      .et-btn--ghost       { color: #888898 !important; }
      .et-btn--ghost:hover { background: #25252F !important; }
      .et-audio            { background: #23232E !important; border-color: #282833 !important; }
      .et-qnav__btn        { background: #23232E !important; border-color: #30303C !important; color: #C4C4D8 !important; }
      .et-div, .et-vdiv    { background: #282833 !important; }
    `;
  }

  if (surface === 'sharp') {
    css += `
      .et-card, .et-card--raised { border-radius: 2px !important; }
      .et-option  { border-radius: 2px !important; }
      .et-audio   { border-radius: 2px !important; }
      .et-chip    { border-radius: 3px !important; }
      .et-qnav__btn { border-radius: 2px !important; }
    `;
  } else if (surface === 'soft') {
    css += `
      .et-card, .et-card--raised { border-radius: 22px !important; }
      .et-option  { border-radius: 16px !important; }
      .et-audio   { border-radius: 18px !important; }
      .et-btn     { border-radius: 999px !important; }
    `;
  }

  return css;
}

const STEP_LANDING       = { id: 'landing',         label: 'Overview',                 Component: Landing };
const STEP_AUDIO         = { id: 'audio',           label: 'Audio check',              Component: AudioCheck };
const STEP_INST_LISTEN   = { id: 'inst-listening',  label: 'Listening instructions',   Component: InstructionsListening, enterSection: 'listening' };
const STEP_LISTENING     = { id: 'listening',       label: 'Listening',                Component: Listening };
const STEP_END_LISTENING = { id: 'end-listening',   label: 'End of Listening',         Component: EndOfListening };
const STEP_INST_READING  = { id: 'inst-reading',    label: 'Reading instructions',     Component: InstructionsReading,   enterSection: 'reading' };
const STEP_READING       = { id: 'reading',         label: 'Reading',                  Component: Reading };
const STEP_RESULTS       = { id: 'results',         label: 'Results',                  Component: Results };

function buildFlow(version) {
  if (version === 'short') {
    return [STEP_LANDING, STEP_INST_READING, STEP_READING, STEP_RESULTS];
  }
  return [
    STEP_LANDING, STEP_AUDIO,
    STEP_INST_LISTEN, STEP_LISTENING, STEP_END_LISTENING,
    STEP_INST_READING, STEP_READING, STEP_RESULTS,
  ];
}

// --- URL routing ----------------------------------------------------------
// `/exam/full` and `/exam/short` are the two entry links — each opens on the
// landing (overview) of that version, and every later test screen shares the
// same locked `/exam/:v` URL, so once a candidate starts the address bar stops
// moving and never reveals progress. `/` stays as an alias for the full
// landing (the original public URL). A refresh inside `/exam/:v` restarts the
// attempt back at the overview. The URL only picks WHICH PAPER to ask for —
// the version that actually runs is derived from the loaded paper's content
// (see ExamContext), which is what gives parent-launched short papers
// (`/exam?t=...`) the right flow.

// Screens that count as "inside the exam" — they share the locked URL, and
// leaving the page from any of them abandons the attempt (beforeunload warning).
const IN_EXAM_STEPS = new Set(['audio', 'inst-listening', 'listening', 'end-listening', 'inst-reading', 'reading', 'results']);

const norm = (v) => (v === 'short' ? 'short' : 'full');

// Screen -> URL. The full landing keeps the bare `/`; everything else
// collapses to the one locked `/exam/:v` path.
function pathForStep(stepId, version) {
  if (stepId === 'landing' && norm(version) === 'full') return '/';
  return `/exam/${norm(version)}`;
}

// URL -> { version, stepId, isExam }, or null when it's not a route we own.
function routeForPath(path) {
  const clean = (path || '/').replace(/\/+$/, '') || '/';
  if (clean === '/') return { version: 'full', stepId: 'landing', isExam: false };
  const m = clean.match(/^\/exam(?:\/(full|short))?$/);
  if (m) {
    const v = m[1] || 'full';
    if (v === 'short' && !SHORT_ENABLED) return null;
    return { version: v, stepId: 'landing', isExam: true };
  }
  return null;
}

function ExamLoading() {
  return (
    <div className="et et-screen et-screen--white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 14, color: 'var(--fg-3)', fontWeight: 600 }}>Loading exam…</div>
    </div>
  );
}

function ExamLoadError({ error, onRetry }) {
  const message = String(error?.message || error || 'Unknown error');
  const looksUnseeded = /no papers found|fetch|networkerror|failed/i.test(message);
  return (
    <div className="et et-screen et-screen--white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 32 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)' }}>Could not load the exam</div>
      <pre style={{ maxWidth: 560, whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--fg-3)', margin: 0, textAlign: 'center' }}>{message}</pre>
      {looksUnseeded && (
        <div style={{ fontSize: 13, color: 'var(--fg-2)', maxWidth: 480, textAlign: 'center' }}>
          Make sure the API server is running and the database has been seeded. Open <a href="/admin">/admin</a> and click <strong>Seed from JSON</strong>.
        </div>
      )}
      <button type="button" className="et-btn et-btn--primary" onClick={(e) => { e.stopPropagation(); onRetry?.(); }}>
        Try again
      </button>
    </div>
  );
}

const NEXT_PATTERNS = [
  'start the test', 'read instructions', 'yes, continue', 'next question',
  'next passage', 'next conversation', 'begin section', 'begin', 'submit',
  'start listening', 'start reading',
];
const PREV_PATTERNS = ['previous'];

const TWEAK_DEFAULTS = {
  brand: ['#F87014', '#FFEEDF', '#FFF6EE'],
  atmosphere: 'default',
  surface: 'default',
};

function buildPlaces(flow, exam) {
  const places = [];
  for (let i = 0; i < flow.length; i++) {
    const step = flow[i];
    places.push({ key: step.id, label: step.label, flowIdx: i, depth: 0 });

    if (step.id === 'listening') {
      for (const part of partsBySection(exam, 'listening')) {
        places.push({
          key: `listening-${part.number}-intro`,
          label: `Part ${part.number} · ${part.title} — Intro`,
          flowIdx: i,
          depth: 1,
          partNumber: part.number,
          groupIndex: 0,
          started: false,
        });
        for (let g = 0; g < part.groups.length; g++) {
          places.push({
            key: `listening-${part.number}-g${g}`,
            label: `P${part.number} · Q${g + 1} of ${part.groups.length}`,
            flowIdx: i,
            depth: 2,
            partNumber: part.number,
            groupIndex: g,
            started: true,
          });
        }
      }
    } else if (step.id === 'reading') {
      for (const part of partsBySection(exam, 'reading')) {
        for (let g = 0; g < part.groups.length; g++) {
          places.push({
            key: `reading-${part.number}-g${g}`,
            label: `P${part.number} · ${part.title} · Q${g + 1} of ${part.groups.length}`,
            flowIdx: i,
            depth: 1,
            partNumber: part.number,
            groupIndex: g,
          });
        }
      }
    }
  }
  return places;
}

function FinalApp({ path = '/' }) {
  const [idx, setIdx] = useState(() => {
    const r = routeForPath(path);
    if (!r) return 0;
    const i = buildFlow(r.version || 'full').findIndex((s) => s.id === r.stepId);
    return i >= 0 ? i : 0;
  });
  const [t] = useTweaks(TWEAK_DEFAULTS);
  const {
    exam, isLoading, error, reload,
    enterSection, mode, setMode, secondsPerItem, setSecondsPerItem,
    position, setPosition, startedParts, setPartStarted,
    startExamTimer, examStartedAt, examTotalSeconds, setTimeRemaining,
    version, setVersion, resetExam, attemptId, commitAttempt,
  } = useExam();

  const FLOW = useMemo(() => buildFlow(version), [version]);
  const PLACES = useMemo(() => buildPlaces(FLOW, exam), [FLOW, exam]);

  useEffect(() => {
    if (idx >= FLOW.length) setIdx(Math.max(0, FLOW.length - 1));
  }, [FLOW, idx]);

  useEffect(() => {
    let el = document.getElementById('__tweaks-css');
    if (!el) {
      el = document.createElement('style');
      el.id = '__tweaks-css';
      document.head.appendChild(el);
    }
    el.textContent = buildCSS({
      brand: t.brand || TWEAK_DEFAULTS.brand,
      atmosphere: t.atmosphere || 'default',
      surface: t.surface || 'default',
    });
  }, [t.brand, t.atmosphere, t.surface]);

  // The single test clock starts the moment the candidate reaches the first
  // timed screen — the Listening instructions for the full test, the Reading
  // instructions for the listening-less short test.
  const startsExamClock = (stepId) =>
    version === 'short' ? stepId === 'inst-reading' : stepId === 'inst-listening';

  const goTo = (n) => {
    if (n < 0 || n >= FLOW.length) return;
    const step = FLOW[n];
    if (startsExamClock(step.id)) {
      startExamTimer();
      // Anonymous mode defers attempt creation until this point — the
      // candidate has clicked through "Yes, I'm ready" and the test clock is
      // about to tick. No-op when an attemptId is already set (parent-launched
      // sessions, or a previous commit during this mount).
      commitAttempt();
    }
    if (step.enterSection) enterSection(step.enterSection);
    setIdx(n);
    window.scrollTo(0, 0);
  };

  const goToPlace = (place) => {
    if (place.partNumber != null) {
      if (startsExamClock(FLOW[place.flowIdx]?.id)) { startExamTimer(); commitAttempt(); }
      setPosition({ partNumber: place.partNumber, groupIndex: place.groupIndex });
      if (place.started !== undefined) setPartStarted(place.partNumber, place.started);
      setIdx(place.flowIdx);
    } else {
      goTo(place.flowIdx);
      return;
    }
    window.scrollTo(0, 0);
  };

  const exitTest = () => {
    resetExam();
    setIdx(0);
    window.scrollTo(0, 0);
  };

  // Adopt the version named in the URL, once, on mount. ExamContext already
  // reads the same URL for its initial paper request, so this is normally a
  // no-op — it only matters when this component mounts on a path the provider
  // didn't see (e.g. a popstate-driven remount).
  const examEntryPending = useRef(routeForPath(path)?.isExam === true);
  useEffect(() => {
    const r = routeForPath(path);
    if (r?.version && r.version !== version) setVersion(r.version);
  }, []);

  // Exam entry link / refresh on `/exam/:v`: once the paper is loaded and its
  // version derived, wipe any prior attempt and open on the landing. A fresh
  // mount on every page load means refreshing mid-exam restarts the test from
  // scratch. Session mode (a launch token was consumed during loadExam) skips
  // the wipe — ExamContext already cleared local state and attaching to the
  // same attempt row is the whole point. Note the derived version is trusted
  // over the URL's segment: a token launch at `/exam` may well resolve to the
  // short paper.
  useEffect(() => {
    if (!examEntryPending.current || exam == null || version == null) return;
    if (!attemptId) resetExam();
    goTo(0);
    examEntryPending.current = false;
  }, [exam, version, attemptId]);

  // Sync URL <- screen, and make Back work only in the choose zone.
  //
  // A forward move to a screen with a new URL (version select -> overview ->
  // exam) pushes a history entry, so Back can retrace the choose zone. Moving
  // backward, or correcting a cold-loaded URL, replaces instead. Every exam
  // screen shares the locked `/exam/:v`, so once the test starts the URL stops
  // moving — and the popstate handler below traps Back inside the exam. The
  // "same screen" guard avoids rewriting while the version state is still
  // catching up to a cold-loaded URL.
  const prevIdxRef = useRef(idx);
  useEffect(() => {
    if (examEntryPending.current) { prevIdxRef.current = idx; return; }
    const stepId = FLOW[idx]?.id;
    const movedForward = idx > prevIdxRef.current;
    prevIdxRef.current = idx;
    const current = routeForPath(stripBase(window.location.pathname));
    const target = pathForStep(stepId, version);
    // "Same screen AND same version" guard: avoids rewriting a cold-loaded URL,
    // but still lets a token launch whose paper resolved short normalize
    // `/exam` -> `/exam/short`.
    if ((current && current.stepId === stepId && norm(current.version) === norm(version)) || !target || stripBase(window.location.pathname) === target) return;
    if (movedForward) window.history.pushState(null, '', withBase(target));
    else window.history.replaceState(null, '', withBase(target));
  }, [idx, version, FLOW]);

  // Browser Back/Forward. Inside the exam it's locked: re-push the exam URL to
  // cancel the navigation so the candidate can't step out or rewind a question
  // (leaving the page entirely is still possible, guarded by beforeunload). In
  // the choose zone, follow the URL so Back returns to the version select.
  useEffect(() => {
    const onPopState = () => {
      const stepId = FLOW[idx]?.id;
      if (IN_EXAM_STEPS.has(stepId)) {
        window.history.pushState(null, '', withBase(pathForStep(stepId, version)));
        return;
      }
      const r = routeForPath(stripBase(window.location.pathname));
      if (!r) return;
      const i = buildFlow(version || 'full').findIndex((s) => s.id === r.stepId);
      if (i >= 0) setIdx(i);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [idx, version, FLOW]);

  // Warn before the page unloads while inside the exam — a refresh or navigating
  // away abandons the attempt (state is cleared on the next load).
  useEffect(() => {
    if (!IN_EXAM_STEPS.has(FLOW[idx]?.id)) return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [FLOW, idx]);

  // When the test-wide clock runs out, jump straight to Results from whatever
  // timed screen the candidate is on. Screens between sections (instructions,
  // end-of-listening) keep the clock running, so they're timed too.
  const resultsIdx = useMemo(() => FLOW.findIndex((s) => s.id === 'results'), [FLOW]);
  useEffect(() => {
    if (examStartedAt == null || resultsIdx < 0) return undefined;
    const TIMED = new Set(['inst-listening', 'listening', 'end-listening', 'inst-reading', 'reading']);
    if (!TIMED.has(FLOW[idx]?.id)) return undefined;

    const goToResults = () => { setIdx(resultsIdx); window.scrollTo(0, 0); };
    const remainingMs = examStartedAt + examTotalSeconds * 1000 - Date.now();
    if (remainingMs <= 0) { goToResults(); return undefined; }
    const id = setTimeout(goToResults, remainingMs);
    return () => clearTimeout(id);
  }, [examStartedAt, examTotalSeconds, idx, FLOW, resultsIdx]);

  const activePlaceKey = useMemo(() => {
    const stepId = FLOW[idx]?.id;
    if (stepId === 'listening' || stepId === 'reading') {
      if (stepId === 'listening' && !startedParts.has(position.partNumber)) {
        return `listening-${position.partNumber}-intro`;
      }
      return `${stepId}-${position.partNumber}-g${position.groupIndex}`;
    }
    return stepId;
  }, [idx, position.partNumber, position.groupIndex, startedParts]);

  const questionProgress = useMemo(() => {
    const stepId = FLOW[idx]?.id;
    const testedSections = new Set(
      FLOW.filter((step) => step.id === 'listening' || step.id === 'reading').map((step) => step.id)
    );
    const testedParts = exam?.parts.filter((part) => testedSections.has(part.section)) || [];
    const total = testedParts.reduce((sum, part) => sum + part.totalItems, 0);
    if (!total) return 0;
    if (stepId === 'results') return 100;

    let reached = 0;
    for (const part of testedParts) {
      const sectionIdx = FLOW.findIndex((step) => step.id === part.section);
      if (sectionIdx < idx) {
        reached += part.totalItems;
        continue;
      }
      if (sectionIdx > idx) break;

      if (part.number !== position.partNumber) {
        if (part.number < position.partNumber) reached += part.totalItems;
        continue;
      }

      const showingListeningIntro = stepId === 'listening' && !startedParts.has(part.number);
      if (!showingListeningIntro) {
        const visibleGroupIndex = Math.min(position.groupIndex, part.groups.length - 1);
        for (let groupIdx = 0; groupIdx <= visibleGroupIndex; groupIdx++) {
          reached += part.groups[groupIdx].items.length;
        }
      }
      break;
    }

    return (reached / total) * 100;
  }, [FLOW, idx, exam, position.partNumber, position.groupIndex, startedParts]);

  const handleClick = (e) => {
    const btn = e.target.closest('button, a[href="#"]');
    if (!btn) return;
    const text = (btn.textContent || '').trim().toLowerCase();
    const isNext = NEXT_PATTERNS.some((p) => text.includes(p));
    const isPrev = PREV_PATTERNS.some((p) => text.startsWith(p));
    if (isNext && idx < FLOW.length - 1) { e.preventDefault(); e.stopPropagation(); goTo(idx + 1); }
    else if (isPrev && idx > 0)          { e.preventDefault(); e.stopPropagation(); goTo(idx - 1); }
  };

  if (isLoading || (!exam && !error)) {
    return <ExamLoading />;
  }
  if (error) {
    return <ExamLoadError error={error} onRetry={reload} />;
  }

  const { Component } = FLOW[idx];

  return (
    <div style={{ width: '100%', height: '100%' }} onClick={handleClick}>
      <Component
        key={idx}
        onFlowNext={() => goTo(idx + 1)}
        onFlowPrev={() => goTo(idx - 1)}
        onExit={exitTest}
      />

      {/* Top progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 99999, pointerEvents: 'none', background: 'transparent' }}>
        <div style={{ height: '100%', width: `${questionProgress}%`, background: 'var(--color-primary)', transition: 'width 320ms ease-out' }} />
      </div>


      {import.meta.env.DEV && (
      <TweaksPanel title="Tweaks">
        <TweakSection title="Screen" subtitle="Jump to any screen, part, or question in the flow">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 320, overflow: 'auto' }}>
            {PLACES.map((p) => {
              const active = activePlaceKey === p.key;
              const isTop = p.depth === 0;
              return (
                <button
                  key={p.key}
                  onClick={(e) => { e.stopPropagation(); goToPlace(p); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: isTop ? '8px 10px' : '5px 10px',
                    paddingLeft: 10 + p.depth * 14,
                    borderRadius: 6, border: 'none',
                    background: active ? 'var(--color-primary-tint)' : 'transparent',
                    color: active ? 'var(--color-primary)' : (isTop ? 'var(--fg-2)' : 'var(--fg-3)'),
                    fontFamily: 'var(--font-sans)',
                    fontSize: isTop ? 13 : 11.5,
                    fontWeight: active ? 700 : (isTop ? 600 : 500),
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'background 120ms ease',
                  }}
                >
                  {isTop && (
                    <span style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      background: active ? 'var(--color-primary)' : 'var(--gf-cloud-3)',
                      color: active ? '#fff' : 'var(--fg-3)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>{p.flowIdx + 1}</span>
                  )}
                  {!isTop && (
                    <span style={{
                      width: 5, height: 5, borderRadius: 999, flexShrink: 0,
                      background: active ? 'var(--color-primary)' : 'var(--gf-cloud-3)',
                    }} />
                  )}
                  {p.label}
                </button>
              );
            })}
          </div>
        </TweakSection>

        <TweakSection title="Version" subtitle="Full includes Listening + Reading. Short is reading-only.">
          <TweakRadio
            value={version ?? 'full'}
            onChange={(v) => { setVersion(v); setIdx(0); }}
            options={[
              { value: 'full',  label: 'Full · Listening + Reading' },
              ...(SHORT_ENABLED ? [{ value: 'short', label: 'Short · Reading only' }] : []),
            ]}
          />
        </TweakSection>

        <TweakSection title="Exam mode (dev)" subtitle="Strict = auto-play audio, countdown, no manual navigation. Free = full control for testing.">
          <TweakRadio
            value={mode}
            onChange={(v) => setMode(v)}
            options={[
              { value: 'strict', label: 'Strict' },
              { value: 'free',   label: 'Free' },
            ]}
          />
          {mode === 'strict' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(41,38,27,.72)', fontWeight: 500 }}>Seconds per question</span>
              <input
                type="number"
                min={5}
                max={120}
                step={5}
                value={secondsPerItem}
                onChange={(e) => setSecondsPerItem(Math.max(5, Math.min(120, Number(e.target.value) || 30)))}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 56, height: 24, padding: '0 6px', border: '.5px solid rgba(0,0,0,.15)', borderRadius: 6, background: 'rgba(255,255,255,.7)', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}
              />
            </div>
          )}
        </TweakSection>

        <TweakSection title="Time's up (dev)" subtitle="Backdate the test clock to test expiry. At 0 the app jumps to Results — must be inside the exam.">
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: '30s left', secs: 30 },
              { label: '10s left', secs: 10 },
              { label: 'End now', secs: 0 },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={(e) => { e.stopPropagation(); setTimeRemaining(b.secs); }}
                style={{
                  flex: 1, minHeight: 26, padding: '0 8px', cursor: 'pointer',
                  border: '.5px solid rgba(0,0,0,.15)', borderRadius: 6,
                  background: b.secs === 0 ? 'rgba(214,69,69,.12)' : 'rgba(255,255,255,.7)',
                  color: b.secs === 0 ? '#b22' : 'inherit',
                  font: 'inherit', fontWeight: 500,
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </TweakSection>
      </TweaksPanel>
      )}
    </div>
  );
}

function usePathRoute() {
  // Paths are app-relative: the gateway prefix (e.g. /english) is stripped so
  // every route match below works the same standalone and behind the gateway.
  const [path, setPath] = useState(() => (typeof window !== 'undefined' ? stripBase(window.location.pathname) : '/'));
  useEffect(() => {
    // Browser back/forward only — in-app links are plain anchors that do a full
    // navigation (the SPA fallback re-serves index.html, then we read the path).
    const onChange = () => setPath(stripBase(window.location.pathname));
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return path;
}

export default function App() {
  const path = usePathRoute();
  if (path.startsWith('/admin')) {
    return <AdminApp />;
  }
  // Read-only result view opened by the parent site (signed view-token link).
  if (path.startsWith('/result')) {
    return <ResultViewer />;
  }
  return (
    <ExamProvider>
      <FinalApp path={path} />
    </ExamProvider>
  );
}
