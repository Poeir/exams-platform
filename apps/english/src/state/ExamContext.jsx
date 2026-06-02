import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildExam, partsBySection } from '../data/exam.js';
import { listPapers, getPaper, consumeLaunchToken, createAnonymousAttempt, saveAttemptAnswers, submitAttempt, abandonAttempt } from '../data/examRepo.js';
import { stripBase } from '../lib/base.js';

const ExamContext = createContext(null);

const STORAGE_KEYS = {
  answers:  'et-answers',
  flagged:  'et-flagged',
  position: 'et-position',
  attempt:  'et-attempt-id',
};

// One-time read of ?t=<launch_token> from the URL. Stripped from the address
// bar after consume so a refresh can't try to reuse it.
function readLaunchToken() {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search);
  return p.get('t');
}

function clearLaunchTokenFromUrl() {
  if (typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  u.searchParams.delete('t');
  window.history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash);
}

// `minutes` here is only the fallback when the loaded paper has no
// time_limit_min of its own — see examTotalSeconds below.
export const VERSIONS = {
  full:  { id: 'full',  label: 'Full',  minutes: 50, sections: ['listening', 'reading'] },
  short: { id: 'short', label: 'Short', minutes: 20, sections: ['reading'] },
};

// The short (reading-only) version is a separate question set — a paper in the
// DB with no listening (Part 1–4) sections. Flip to false to make /exam/short
// and the Tweaks version switch unreachable again.
export const SHORT_ENABLED = true;

// Initial version request, read once from the URL: /exam/short asks for the
// short, reading-only paper; everything else starts from the full one. This
// only picks WHICH PAPER to load — the version the app actually runs is
// derived from that paper's content in loadExam, so a parent-launched session
// (/exam?t=..., no version segment) still gets the right flow.
function readRequestedVersion() {
  if (typeof window === 'undefined') return 'full';
  return SHORT_ENABLED && /^\/exam\/short\/?$/.test(stripBase(window.location.pathname)) ? 'short' : 'full';
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function ExamProvider({ children }) {
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // When the parent site launches us via /exam?t=<token>, attemptId holds the
  // server-side attempt row. Persisted to sessionStorage so a refresh inside
  // the same tab can keep autosaving to the same row; cleared by resetExam.
  const [attemptId, setAttemptId] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEYS.attempt) || null; }
    catch { return null; }
  });

  const [answers,  setAnswers]  = useState(() => readJSON(STORAGE_KEYS.answers, {}));
  const [flagged,  setFlagged]  = useState(() => new Set(readJSON(STORAGE_KEYS.flagged, [])));
  const [position, setPosition] = useState(() =>
    readJSON(STORAGE_KEYS.position, { partNumber: 1, groupIndex: 0 })
  );
  // mode / secondsPerItem / version are session-only config — kept in memory,
  // not persisted to localStorage (a page load restarts the exam anyway).
  const [mode, setMode] = useState('strict');
  const [secondsPerItem, setSecondsPerItem] = useState(30);
  const [startedParts, setStartedPartsState] = useState(() => new Set());
  // Single test-wide countdown. Set once, when the Listening section begins
  // (or Reading, for the listening-less short version), and shared by every
  // timed screen through `examTotalSeconds`.
  const [examStartedAt, setExamStartedAt] = useState(null);
  // `requestedVersion` drives which paper loadExam asks for; `version` is what
  // the loaded paper turned out to be (full when it has listening parts,
  // short otherwise) and is what the rest of the app keys the flow on.
  const [requestedVersion, setRequestedVersion] = useState(readRequestedVersion);
  const [version, setVersionState] = useState(null);

  const loadExam = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Two entry points:
      //   1. Session mode — parent site handed us a one-time launch_token via
      //      /exam?t=... → trade it for the attempt row the parent already
      //      paid for. Commit is implicit at consume time.
      //   2. Anonymous walk-in — public URL, no token. ONLY load the paper
      //      here; defer attempt creation until the candidate explicitly
      //      commits by clicking through Audio Check ("Yes, I'm ready").
      //      Browsing the landing / refreshing version-select must NOT
      //      create rows.
      const token = readLaunchToken();
      let attempt = null, paper;
      if (token) {
        try {
          ({ attempt, paper } = await consumeLaunchToken(token));
        } finally {
          clearLaunchTokenFromUrl();
        }
      } else {
        // Stale anon attempt from a prior commit? Abandon it server-side so
        // it doesn't linger as in_progress. The previous attempt only had
        // sessionStorage residue if the candidate had committed before
        // refreshing — see the beforeunload contract in App.jsx.
        let staleId = null;
        try { staleId = sessionStorage.getItem(STORAGE_KEYS.attempt); } catch {}
        if (staleId) {
          abandonAttempt(staleId).catch(() => {});
          try { sessionStorage.removeItem(STORAGE_KEYS.attempt); } catch {}
        }
        // Load the paper without creating an attempt. Which paper is which is
        // the server-computed `variant` on the list — keyed off the paper
        // NAME (a name containing "short" / "สั้น" is the short set). For the
        // full version prefer a 'full' paper, mirroring the server's
        // /attempts/anonymous fallback; a missing field (older server) counts
        // as full.
        const papers = await listPapers();
        if (!papers || papers.length === 0) {
          throw new Error('No papers found. Open /admin and click "Seed from JSON" first.');
        }
        const match = requestedVersion === 'short'
          ? papers.find((p) => p.variant === 'short')
          : papers.find((p) => p.variant !== 'short') || papers[0];
        if (!match) {
          throw new Error('No short paper found. Seed a paper whose name contains "Short" via /admin first.');
        }
        paper = await getPaper(match.id);
      }

      setAttemptId(attempt ? attempt.id : null);
      if (attempt) {
        try { sessionStorage.setItem(STORAGE_KEYS.attempt, attempt.id); } catch {}
      }
      setAnswers({});
      setFlagged(new Set());
      setStartedPartsState(new Set());
      setExamStartedAt(null);

      const built = buildExam(paper);
      setExam(built);
      // The loaded paper decides the flow, not the URL: no listening parts =
      // the short, reading-only version. This is what makes a parent-launched
      // short paper (launch_url is just /exam?t=...) skip the audio screens.
      setVersionState(partsBySection(built, 'listening').length > 0 ? 'full' : 'short');
      if (built?.parts?.length > 0) {
        // Snap the cursor to the paper's first part when the current position
        // points at a part this paper doesn't have (stale localStorage, or a
        // switch between the full and short papers).
        setPosition((prev) =>
          built.parts.some((p) => p.number === prev.partNumber)
            ? prev
            : { partNumber: built.parts[0].number, groupIndex: 0 }
        );
      }
    } catch (err) {
      console.error('Failed to load exam', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [requestedVersion]);

  useEffect(() => { loadExam(); }, [loadExam]);

  // Server-side autosave: in session mode, push `answers` to the attempt row
  // ~500ms after each change. Stand-alone runs continue to use localStorage
  // (handled by the effect just below). On failure we log but keep going —
  // the next change retries; the final submit also resends the full map.
  useEffect(() => {
    if (!attemptId) return undefined;
    const handle = setTimeout(() => {
      saveAttemptAnswers(attemptId, answers).catch((e) => {
        console.warn('autosave failed', e);
      });
    }, 500);
    return () => clearTimeout(handle);
  }, [attemptId, answers]);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.answers,  JSON.stringify(answers)); }, [answers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.flagged,  JSON.stringify([...flagged])); }, [flagged]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.position, JSON.stringify(position)); }, [position]);

  // Requesting a version switches which paper gets loaded (loadExam re-runs
  // via its requestedVersion dependency); the `version` exposed on the context
  // is derived from that paper once it arrives.
  const setVersion = useCallback((v) => {
    if (v !== 'full' && v !== 'short') return;
    if (v === 'short' && !SHORT_ENABLED) return;
    setRequestedVersion(v);
  }, []);

  // The paper's own time limit wins; VERSIONS only backstops papers that were
  // seeded without one.
  const examTotalSeconds = useMemo(() => {
    const minutes = exam?.meta?.time_limit_min || (VERSIONS[version] || VERSIONS.full).minutes;
    return minutes * 60;
  }, [exam, version]);

  const answer = useCallback((itemId, letter) => {
    setAnswers((prev) => ({ ...prev, [itemId]: letter }));
  }, []);

  const toggleFlag = useCallback((itemId) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const resetExam = useCallback(() => {
    setAnswers({});
    setFlagged(new Set());
    setPosition({ partNumber: exam?.parts[0]?.number ?? 1, groupIndex: 0 });
    setStartedPartsState(new Set());
    setExamStartedAt(null);
    // attemptId stays — the attempt created on initial mount is reused for the
    // whole session. The autosave effect will PATCH the now-empty answers back
    // to the server, which is the intended semantics of "start over". A new
    // attempt row is only created on a fresh page load (or on a parent-issued
    // launch_token).
  }, [exam]);

  // Final submit. In session mode the server scores against its own answer key
  // and snapshots the result onto the attempt row (which it also pushes back
  // to the parent's callback_url). Returns the result payload either way.
  const submitFinal = useCallback(async () => {
    if (!attemptId) return null;
    const res = await submitAttempt(attemptId, answers);
    return res?.attempt?.result || null;
  }, [attemptId, answers]);

  const startExamTimer = useCallback(() => {
    setExamStartedAt((startedAt) => startedAt ?? Date.now());
  }, []);

  // Create the server-side attempt row at the point the candidate commits to
  // taking the test (clicking "Yes, I'm ready" through Audio Check → triggers
  // the exam clock in App.jsx, which calls this). Idempotent: parent-launched
  // runs already have attemptId from consume, and subsequent calls inside the
  // same run skip the network round-trip.
  const committingRef = useRef(false);
  const commitAttempt = useCallback(async () => {
    if (attemptId || committingRef.current) return attemptId;
    committingRef.current = true;
    try {
      const paperId = exam?.meta?.id;
      const { attempt } = await createAnonymousAttempt(paperId);
      setAttemptId(attempt.id);
      try { sessionStorage.setItem(STORAGE_KEYS.attempt, attempt.id); } catch {}
      return attempt.id;
    } catch (err) {
      console.warn('Could not create anonymous attempt — autosave will be disabled', err);
      return null;
    } finally {
      committingRef.current = false;
    }
  }, [attemptId, exam]);

  // Dev/testing only: shift the test-wide clock so `seconds` remain (0 = expire
  // immediately). Backdating examStartedAt drives the real countdown, so the
  // "time's up" → Results jump in App.jsx fires exactly as it would in a real run.
  const setTimeRemaining = useCallback((seconds) => {
    const elapsed = Math.max(0, examTotalSeconds - Math.max(0, seconds));
    setExamStartedAt(Date.now() - elapsed * 1000);
  }, [examTotalSeconds]);

  const enterSection = useCallback((section) => {
    const first = exam?.parts.find((p) => p.section === section);
    if (first) setPosition({ partNumber: first.number, groupIndex: 0 });
  }, [exam]);

  const setPartStarted = useCallback((partNumber, started) => {
    setStartedPartsState((prev) => {
      const has = prev.has(partNumber);
      if (started && has) return prev;
      if (!started && !has) return prev;
      const next = new Set(prev);
      if (started) next.add(partNumber); else next.delete(partNumber);
      return next;
    });
  }, []);

  const resetStartedParts = useCallback(() => setStartedPartsState(new Set()), []);

  const value = useMemo(
    () => ({
      exam, isLoading, error, reload: loadExam,
      answers, flagged, position, setPosition,
      answer, toggleFlag, resetExam, enterSection,
      mode, setMode,
      secondsPerItem, setSecondsPerItem,
      startedParts, setPartStarted, resetStartedParts,
      examStartedAt, startExamTimer, setTimeRemaining, examTotalSeconds,
      version, setVersion,
      attemptId, submitFinal, commitAttempt,
    }),
    [exam, isLoading, error, loadExam, answers, flagged, position, answer, toggleFlag, resetExam, enterSection, mode, secondsPerItem, startedParts, setPartStarted, resetStartedParts, examStartedAt, startExamTimer, setTimeRemaining, examTotalSeconds, version, setVersion, attemptId, submitFinal, commitAttempt]
  );

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
}

export function useExam() {
  const ctx = useContext(ExamContext);
  if (!ctx) throw new Error('useExam must be used within ExamProvider');
  return ctx;
}

/**
 * Live countdown for the test-wide timer. Returns the seconds remaining until
 * the exam clock expires and whether the clock has started yet. Drives the
 * displayed timer on every timed screen; the actual "time's up" navigation is
 * handled centrally in App.jsx.
 */
export function useExamCountdown() {
  const { examStartedAt, examTotalSeconds } = useExam();
  const [remaining, setRemaining] = useState(examTotalSeconds);

  useEffect(() => {
    if (examStartedAt == null) {
      setRemaining(examTotalSeconds);
      return undefined;
    }
    const tick = () => {
      const expiresAt = examStartedAt + examTotalSeconds * 1000;
      setRemaining(Math.max(0, (expiresAt - Date.now()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [examStartedAt, examTotalSeconds]);

  return { remaining, started: examStartedAt != null };
}
