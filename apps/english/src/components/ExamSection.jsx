import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ETIcon, ETTopbar, ETFootbar, ETBtn, ETPhoto, ETAudioStatus } from './Common.jsx';
import ExamClock from './ExamClock.jsx';
import Eyebrow from './Eyebrow.jsx';
import QuestionBlock from './QuestionBlock.jsx';
import CountdownCircle from './CountdownCircle.jsx';
import SampleQuestion from './SampleQuestion.jsx';
import { partsBySection, unansweredExamItems } from '../data/exam.js';
import { useExam, VERSIONS } from '../state/ExamContext.jsx';
import { LISTENING_PARTS } from '../screens/Instructions.jsx';
import { POST_AUDIO_BUFFER_SEC, playStartBeep } from './examAudio.js';
import { withBase } from '../lib/base.js';

const READING_HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Yellow', value: '#FFE3A3' },
  { id: 'green', label: 'Green', value: '#CFF7D3' },
  { id: 'blue', label: 'Blue', value: '#CFE4FF' },
  { id: 'pink', label: 'Pink', value: '#FFD6E7' },
];

function getSelectionOffsets(container, passage) {
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;
  const text = range.toString();
  const end = start + text.length;

  if (!text.trim()) return null;
  if (passage.slice(start, end) !== text) return null;

  const rect = range.getBoundingClientRect();
  return {
    start,
    end,
    text,
    rect: {
      top: rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - 300),
    },
  };
}

function renderAnnotatedText(text, highlights = [], onRemoveHighlight, eraserActive = false) {
  if (!text || highlights.length === 0) return text;

  const selected = [];
  highlights
    .filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start)
    .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
    .forEach((match) => {
      if (!selected.some((item) => match.start < item.end && match.end > item.start)) {
        selected.push(match);
      }
    });

  if (selected.length === 0) return text;

  const parts = [];
  let cursor = 0;
  selected.forEach((match, index) => {
    if (match.start > cursor) {
      parts.push(<React.Fragment key={`text-${index}`}>{text.slice(cursor, match.start)}</React.Fragment>);
    }
    parts.push(
      <mark
        key={match.id || `mark-${index}`}
        className={`et-reading-tools__mark${eraserActive ? ' et-reading-tools__mark--eraser' : ''}${match.comment ? ' et-reading-tools__mark--commented' : ''}`}
        style={{ background: match.color }}
        onClick={eraserActive ? (e) => { e.stopPropagation(); onRemoveHighlight?.(match.id); } : undefined}
      >
        {text.slice(match.start, match.end)}
        {match.comment && (
          <span className="et-reading-tools__tooltip" role="tooltip">
            {match.comment}
          </span>
        )}
      </mark>
    );
    cursor = match.end;
  });
  if (cursor < text.length) parts.push(<React.Fragment key="text-end">{text.slice(cursor)}</React.Fragment>);
  return parts;
}

function ReadingComprehensionTools({ color, onColorChange, mode, onModeChange, highlights, onClear }) {
  return (
    <div className="et-reading-tools" onClick={(e) => e.stopPropagation()}>
      <div className="et-reading-tools__header">
        <Eyebrow>Highlight</Eyebrow>
        <span className="et-reading-tools__count">{highlights.length}</span>
      </div>
      <div className="et-reading-tools__swatches" role="group" aria-label="Highlight color">
        <button
          type="button"
          className={`et-reading-tools__mode${mode === 'select' ? ' et-reading-tools__mode--active' : ''}`}
          onClick={() => onModeChange('select')}
        >
          Select
        </button>
        {READING_HIGHLIGHT_COLORS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`et-reading-tools__swatch${mode === 'highlight' && color === item.value ? ' et-reading-tools__swatch--active' : ''}`}
            style={{ background: item.value }}
            title={item.label}
            aria-label={item.label}
            onClick={() => { onModeChange('highlight'); onColorChange(item.value); }}
          />
        ))}
        <button
          type="button"
          className={`et-reading-tools__eraser${mode === 'erase' ? ' et-reading-tools__eraser--active' : ''}`}
          onClick={() => onModeChange(mode === 'erase' ? 'highlight' : 'erase')}
        >
          Erase
        </button>
      </div>
      <div className="et-reading-tools__hint">
        {mode === 'erase' ? 'Click a highlight to remove it.' : mode === 'highlight' ? 'Drag text to highlight it.' : 'Text selection will not highlight.'}
      </div>
      <div className="et-reading-tools__actions">
        <button type="button" onClick={onClear} disabled={highlights.length === 0}>Clear all</button>
      </div>
      {highlights.some((item) => item.comment) && (
        <div className="et-reading-tools__comments">
          {highlights.filter((item) => item.comment).map((item) => (
            <div key={item.id} className="et-reading-tools__comment" style={{ borderLeftColor: item.color }}>
              <strong>{item.text}</strong>
              <span>{item.comment}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnotationCommentPopover({ position, value, onChange, onSave }) {
  if (!position) return null;
  return (
    <>
      <button
        type="button"
        className="et-annotation-popover__backdrop"
        aria-label="Close comment editor"
        onMouseDown={onSave}
      />
      <div
        className="et-annotation-popover"
        style={{ top: position.top, left: position.left }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Comment"
          aria-label="Highlight comment"
          rows={3}
          autoFocus
        />
      </div>
    </>
  );
}
function PassageCard({ passage, label, strict, highlights = [], toolMode = 'highlight', onCreateHighlight, onRemoveHighlight }) {
  const passageRef = useRef(null);

  if (!passage) return null;
  if (strict) {
    return (
      <div className="et-card" style={{ padding: '18px 22px', marginBottom: 20, background: 'var(--gf-soft-cloud-2)' }}>
        <div style={{ fontSize: 13, color: 'var(--fg-3)', fontStyle: 'italic', fontWeight: 500 }}>
          Listen to the recording — the transcript is not shown for this part.
        </div>
      </div>
    );
  }

  const handleSelect = () => {
    if (toolMode !== 'highlight') return;
    const container = passageRef.current;
    if (!container) return;
    const selection = getSelectionOffsets(container, passage);
    if (!selection) return;
    onCreateHighlight?.(selection);
    window.getSelection?.().removeAllRanges();
  };

  return (
    <div className="et-card" style={{ padding: '18px 22px', marginBottom: 20 }}>
      <div
        ref={passageRef}
        onMouseUp={handleSelect}
        onKeyUp={handleSelect}
        className={toolMode === 'erase' ? 'et-reading-passage et-reading-passage--erase' : 'et-reading-passage'}
        style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.7, color: 'var(--fg-2)', fontWeight: 500 }}
      >
        {renderAnnotatedText(passage, highlights, onRemoveHighlight, toolMode === 'erase')}
      </div>
    </div>
  );
}
function ExamAudioBar({ playing, blocked, ended }) {
  const status = blocked
    ? 'Tap play to hear the recording.'
    : ended
      ? 'Choose your answer.'
      : playing
        ? 'Now playing — listen carefully.'
        : 'Loading audio…';

  return <ETAudioStatus status={status} active={playing} />;
}

function PhotographArea({ item }) {
  const extras = item?.options?._extras;
  const prompt = extras?.image_prompt;
  const url = extras?.image_url;
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [url]);

  if (url && !failed) {
    return (
      <div
        style={{
          aspectRatio: '16 / 9',
          marginBottom: 20,
          borderRadius: 12,
          overflow: 'hidden',
          background: '#0b0b0f',
        }}
      >
        <img
          src={url}
          alt={prompt || 'Photograph'}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }

  return <ETPhoto style={{ aspectRatio: '16 / 9', marginBottom: 20 }} label={prompt || 'Photograph'} />;
}

// Placeholder per-group question audio until real ones are produced.
const LISTENING_QUESTION_AUDIO = withBase('/voice/08_not_avaliable.mp3');
// Post-audio answer time for listening groups: 7s for single-item, 17*N for multi-item.
function listeningPostAudioSec(itemCount) {
  return itemCount <= 1 ? 7 : 17 * itemCount;
}

function PartIntroScreen({ part, sectionLabel, audioSrc, onStart, onExit, allowSkip = false }) {
  const crumbs = [
    { text: sectionLabel },
    { text: `Part ${part.number} · ${part.title}`, strong: true },
  ];

  const audioRef = useRef(null);
  const advancedRef = useRef(false);
  const [total, setTotal] = useState(null);     // duration + buffer (seconds)
  const [remaining, setRemaining] = useState(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [phase, setPhase] = useState('beep');   // 'beep' | 'loading' | 'playing' | 'buffer' | 'done'

  // Set up audio + auto-play (preceded by a 1s "start" beep)
  useEffect(() => {
    let cancelled = false;

    if (!audioSrc) {
      // No directions audio → still play the beep, then go straight to the 5s buffer
      setPhase('beep');
      playStartBeep().then(() => {
        if (cancelled) return;
        setTotal(POST_AUDIO_BUFFER_SEC);
        setRemaining(POST_AUDIO_BUFFER_SEC);
        setPhase('buffer');
      });
      return () => { cancelled = true; };
    }

    const audio = new Audio(audioSrc);
    audio.preload = 'auto';
    audioRef.current = audio;

    const onMetadata = () => {
      const t = (Number.isFinite(audio.duration) ? audio.duration : 0) + POST_AUDIO_BUFFER_SEC;
      setTotal(t);
      setRemaining(t);
    };
    const onTime = () => {
      if (advancedRef.current) return;
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      const r = Math.max(0, dur - audio.currentTime + POST_AUDIO_BUFFER_SEC);
      setRemaining(r);
    };
    const onPlay = () => { setAudioBlocked(false); setPhase('playing'); };
    const onEnded = () => setPhase('buffer');

    audio.addEventListener('loadedmetadata', onMetadata);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('ended', onEnded);

    // Play the beep first, then start the directions audio
    setPhase('beep');
    playStartBeep().then(() => {
      if (cancelled) return;
      setPhase('loading');
      audio.play().catch(() => {
        // Autoplay blocked — countdown can still tick from buffer phase once metadata arrives.
        setAudioBlocked(true);
      });
    });

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMetadata);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [audioSrc]);

  // Buffer-phase tick: once audio is done (or no audio), count down the trailing buffer.
  useEffect(() => {
    if (phase !== 'buffer') return undefined;
    if (remaining == null) return undefined;
    if (remaining <= 0) return undefined;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, (r ?? 0) - 0.2));
    }, 200);
    return () => clearInterval(id);
  }, [phase, remaining != null, remaining > 0]);

  // Auto-advance when the countdown reaches zero
  useEffect(() => {
    if (remaining === null) return;
    if (remaining > 0) return;
    if (advancedRef.current) return;
    advancedRef.current = true;
    setPhase('done');
    const t = setTimeout(() => onStart?.(), 0);
    return () => clearTimeout(t);
  }, [remaining, onStart]);

  // If autoplay is blocked, let user kick off playback (still no skip).
  const resumeAudio = (e) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
  };

  const skipDirections = (e) => {
    e?.stopPropagation();
    if (advancedRef.current) return;
    advancedRef.current = true;
    try {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    } catch {
      // Ignore browser audio edge cases while skipping the directions.
    }
    setPhase('done');
    onStart?.();
  };

  const status = audioBlocked
    ? 'Press play to hear the directions — the exam starts automatically when audio finishes.'
    : phase === 'beep'
      ? 'Get ready…'
      : phase === 'loading'
        ? 'Loading directions audio…'
        : phase === 'playing'
          ? 'Listen to the directions — the exam starts automatically after the audio.'
          : phase === 'buffer'
            ? `Get ready — exam starts in ${Math.ceil(remaining ?? 0)}…`
            : 'Starting Part ' + part.number + '…';

  return (
    <div className="et et-screen et-screen--white">
      <ETTopbar crumbs={crumbs} timer={<ExamClock />} onExit={onExit} />

      <div className="et-intro-grid">
        <div className="et-intro-pane--left">
          {part.icon && (
            <span
              aria-hidden="true"
              style={{
                width: 48,
                height: 48,
                display: 'inline-flex',
                color: 'var(--color-primary)',
                marginBottom: 14,
              }}
            >
              {part.icon}
            </span>
          )}
          <Eyebrow brand style={{ marginBottom: 8 }}>Part {part.number} of 4</Eyebrow>
          <h1 className="et-display et-display--sm" style={{ marginBottom: 12 }}>{part.title}</h1>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--fg-2)', fontWeight: 500, marginTop: 0, marginBottom: 20 }}>
            {part.directions}
          </p>
          {part.cue && (
            <div
              style={{
                fontSize: 14,
                color: 'var(--fg-2)',
                fontStyle: 'italic',
                fontWeight: 600,
                paddingLeft: 12,
                borderLeft: '3px solid var(--color-primary-soft)',
              }}
            >
              “{part.cue}”
            </div>
          )}
        </div>

        <div className="et-intro-pane--right">
          <div style={{ marginBottom: 16 }}><span className="et-chip et-chip--brand">Example</span></div>
          {part.sample.imageUrl && (
            <div style={{ marginBottom: 18, borderRadius: 12, overflow: 'hidden', background: '#0b0b0f', aspectRatio: '16 / 9' }}>
              <img
                src={part.sample.imageUrl}
                alt="Example photograph"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}
          {(() => {
            const audioOnly = part.number === 1 || part.number === 2;
            const samplePrompt = audioOnly
              ? (part.number === 1
                  ? 'Listen to the four statements and choose the one that best describes the picture.'
                  : 'Choose the best response.')
              : part.sample.prompt;
            return (
              <SampleQuestion
                prompt={samplePrompt}
                options={part.sample.options}
                lettersOnly={audioOnly}
              />
            );
          })()}
        </div>
      </div>

      <footer className="et-footbar et-footbar--inline">
        <span aria-hidden="true" />
        <div className="et-footbar__center" style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
          <ETAudioStatus status={status} active={phase === 'playing'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {audioBlocked && (
            <button
              type="button"
              onClick={resumeAudio}
              className="et-btn et-btn--secondary"
              style={{ height: 36 }}
            >
              <span style={{ width: 14, height: 14, display: 'inline-flex', marginRight: 6 }}>{ETIcon.play}</span>
              Play directions
            </button>
          )}
          <CountdownCircle remaining={remaining ?? 0} total={total ?? POST_AUDIO_BUFFER_SEC} size={44} />
          {allowSkip && (
            <button
              type="button"
              onClick={skipDirections}
              className="et-btn et-btn--ghost et-btn--sm"
              style={{ fontSize: 11, opacity: 0.7 }}
              title="Skip the directions"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={skipDirections}
            className="et-btn et-btn--primary"
          >
            Start Part {part.number}
            <span style={{ display: 'inline-flex', width: 16, height: 16 }}>{ETIcon.arrowRight}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

const LISTENING_PARTS_BY_NUMBER = Object.fromEntries(LISTENING_PARTS.map((p) => [p.number, p]));

// Shown when the candidate triggers the final submit with questions still
// unanswered. Mirrors StartConfirmModal in AudioCheck.jsx. The handlers
// stopPropagation so the button text ("Submit anyway") does not also trip the
// global text-matched navigation in App.jsx.
function SubmitConfirmModal({ unansweredCount, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onCancel]);

  const stop = (e) => e.stopPropagation();
  const handleCancel = (e) => { e.stopPropagation(); onCancel(); };
  const handleConfirm = (e) => { e.stopPropagation(); onConfirm(); };

  return (
    <div
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="et-submit-confirm-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483645,
        background: 'rgba(17, 17, 21, 0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div className="et-card et-card--raised et-modal" onClick={stop}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 999,
            background: 'var(--color-primary-tint)', color: 'var(--color-primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ width: 22, height: 22, display: 'inline-flex' }}>{ETIcon.flag}</span>
          </span>
          <h2 id="et-submit-confirm-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--fg-1)' }}>
            {unansweredCount} question{unansweredCount === 1 ? '' : 's'} still unanswered
          </h2>
        </div>

        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)', fontWeight: 500, lineHeight: 1.6 }}>
          Unanswered questions are marked wrong and cannot be changed once you submit. Review the available questions, or submit now and end the test.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <ETBtn kind="secondary" size="lg" onClick={handleCancel}>Review answers</ETBtn>
          <ETBtn kind="primary" size="lg" iconRight={ETIcon.arrowRight} onClick={handleConfirm}>
            Submit anyway
          </ETBtn>
        </div>
      </div>
    </div>
  );
}

export default function ExamSection({ section, onFlowNext, onFlowPrev, onExit }) {
  const {
    exam, position, setPosition, mode, startedParts, setPartStarted, answers, flagged,
    startExamTimer, version,
  } = useExam();
  // Questions are numbered continuously across only the sections this version
  // actually tests, so the very first question is always 1 (the short,
  // reading-only test must not inherit Listening's 25-question offset).
  const examParts = useMemo(() => {
    const testedSections = (VERSIONS[version] || VERSIONS.full).sections;
    return exam.parts.filter((p) => testedSections.includes(p.section));
  }, [exam, version]);
  const strict = mode === 'strict';
  const parts = useMemo(() => partsBySection(exam, section), [exam, section]);

  // Make sure position is on a part within this section
  useEffect(() => {
    if (!parts.some((p) => p.number === position.partNumber)) {
      setPosition({ partNumber: parts[0]?.number ?? 1, groupIndex: 0 });
    }
  }, [parts, position.partNumber, setPosition]);

  const currentPart = parts.find((p) => p.number === position.partNumber) || parts[0];

  const sectionLabelForIntro = section === 'listening' ? 'Section 1 · Listening' : 'Section 2 · Reading';
  // Only listening uses the per-part intro gate. Reading is self-paced and shows
  // its part directions inline inside the exam content.
  const introData = currentPart && section === 'listening'
    ? LISTENING_PARTS_BY_NUMBER[currentPart.number]
    : null;
  const showIntro = !!introData && currentPart && !startedParts.has(currentPart.number);
  const isReading = section === 'reading';

  const groupIndex = currentPart ? Math.min(position.groupIndex, currentPart.groups.length - 1) : 0;
  const group = currentPart?.groups[groupIndex];

  const isFirstPart  = currentPart && currentPart.number === parts[0].number;
  const isLastPart   = currentPart && currentPart.number === parts[parts.length - 1].number;
  const isFirstGroup = groupIndex === 0;
  const isLastGroup  = currentPart && groupIndex === currentPart.groups.length - 1;
  const atSectionEnd = isLastGroup && isLastPart;

  // Reading is always the final section, so finishing it submits the whole
  // exam. Warn if anything in the whole paper is still unanswered, including
  // strict listening questions that cannot be changed by this point.
  const isFinalSubmit = atSectionEnd && isReading;
  const unanswered = useMemo(() => unansweredExamItems(exam, answers), [exam, answers]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const goToNext = () => {
    if (!isLastGroup) {
      setPosition({ partNumber: currentPart.number, groupIndex: groupIndex + 1 });
    } else if (!isLastPart) {
      const idx = parts.findIndex((p) => p.number === currentPart.number);
      const nextPart = parts[idx + 1];
      setPosition({ partNumber: nextPart.number, groupIndex: 0 });
    } else if (onFlowNext) {
      onFlowNext();
    }
  };

  const onPrev = (e) => {
    e?.stopPropagation();
    if (strict && !isReading) return;
    if (!isFirstGroup) {
      setPosition({ partNumber: currentPart.number, groupIndex: groupIndex - 1 });
    } else if (!isFirstPart) {
      const idx = parts.findIndex((p) => p.number === currentPart.number);
      const prevPart = parts[idx - 1];
      setPosition({ partNumber: prevPart.number, groupIndex: prevPart.groups.length - 1 });
    } else if (onFlowPrev) {
      onFlowPrev();
    }
  };

  const onNext = (e) => {
    e?.stopPropagation();
    if (isFinalSubmit && unanswered.length > 0) {
      setShowSubmitConfirm(true);
      return;
    }
    if (listeningExamActive) {
      try {
        examAudioRef.current?.pause();
        if (examAudioRef.current) examAudioRef.current.currentTime = 0;
      } catch {
        // Ignore browser audio edge cases while moving to the next question.
      }
      endedGroupKeyRef.current = null;
      setExamAudioPlaying(false);
      setExamAudioBlocked(false);
    }
    goToNext();
  };

  const confirmSubmit = () => {
    setShowSubmitConfirm(false);
    goToNext();
  };

  /* -------- Listening exam: per-group audio + post-audio countdown -------- */
  const groupItemsCount = group?.items?.length || 1;
  const postAudioSec = listeningPostAudioSec(groupItemsCount);
  const groupKey = `${currentPart?.number}-${groupIndex}`;
  const listeningExamActive = !isReading && !showIntro && !!group && section === 'listening';
  const groupAudioSrc = group?.items?.[0]?.options?._extras?.audio_url || LISTENING_QUESTION_AUDIO;

  const examAudioRef = useRef(null);
  const endedGroupKeyRef = useRef(null);
  const [examAudioDuration, setExamAudioDuration] = useState(0);
  const [examAudioEnded, setExamAudioEnded] = useState(false);
  const [examAudioPlaying, setExamAudioPlaying] = useState(false);
  const [examAudioBlocked, setExamAudioBlocked] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const totalSeconds = listeningExamActive ? examAudioDuration + postAudioSec : 0;

  // Per-group audio playback — preceded by the same start chime as the intro screens
  useEffect(() => {
    if (!listeningExamActive) return undefined;

    endedGroupKeyRef.current = null;
    setExamAudioDuration(0);
    setExamAudioEnded(false);
    setExamAudioPlaying(false);
    setExamAudioBlocked(false);
    setRemaining(postAudioSec); // until metadata arrives, pre-show the trailing portion

    let cancelled = false;
    const audio = new Audio(groupAudioSrc);
    audio.preload = 'auto';
    examAudioRef.current = audio;

    const onMetadata = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      setExamAudioDuration(dur);
      setRemaining(dur + postAudioSec);
    };
    const onTime = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      const r = Math.max(0, dur - audio.currentTime + postAudioSec);
      setRemaining(r);
    };
    const onPlay = () => { setExamAudioPlaying(true); setExamAudioBlocked(false); };
    const onPause = () => setExamAudioPlaying(false);
    const onEnded = () => {
      endedGroupKeyRef.current = groupKey;
      setExamAudioPlaying(false);
      setExamAudioEnded(true);
    };

    audio.addEventListener('loadedmetadata', onMetadata);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    // Start chime first, then question audio
    playStartBeep().then(() => {
      if (cancelled) return;
      audio.play().catch(() => setExamAudioBlocked(true));
    });

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMetadata);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      examAudioRef.current = null;
    };
  }, [listeningExamActive, groupKey, postAudioSec, groupAudioSrc]);

  // After audio ends, tick down the post-audio buffer
  useEffect(() => {
    if (!listeningExamActive) return undefined;
    if (!examAudioEnded) return undefined;
    if (remaining <= 0) return undefined;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 0.2));
    }, 200);
    return () => clearInterval(id);
  }, [listeningExamActive, examAudioEnded, remaining > 0]);

  // Auto-advance once audio has ended and the post-audio time runs out (strict mode only)
  useEffect(() => {
    if (!listeningExamActive) return;
    if (!strict) return;
    if (!examAudioEnded) return;
    if (endedGroupKeyRef.current !== groupKey) return;
    if (remaining > 0) return;
    const t = setTimeout(() => goToNext(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listeningExamActive, strict, examAudioEnded, remaining]);

  const toggleExamAudio = (e) => {
    e?.stopPropagation();
    const audio = examAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setExamAudioBlocked(false)).catch(() => setExamAudioBlocked(true));
    } else {
      audio.pause();
    }
  };

  // Safety net: ensure the single test clock is running whenever an exam
  // section is on screen, even if the candidate reached it without passing
  // through App's goTo (e.g. dev jumps). startExamTimer is idempotent, and
  // "time's up" navigation is handled centrally in App.jsx.
  useEffect(() => {
    startExamTimer();
  }, [startExamTimer]);

  const [navigatorOpen, setNavigatorOpen] = useState(true);
  const [navigatorSheetOpen, setNavigatorSheetOpen] = useState(false);
  const [readingToolMode, setReadingToolMode] = useState('select');
  const [readingHighlightColor, setReadingHighlightColor] = useState(READING_HIGHLIGHT_COLORS[0].value);
  const [readingCommentDraft, setReadingCommentDraft] = useState('');
  const [readingPendingComment, setReadingPendingComment] = useState(null);
  const [readingHighlights, setReadingHighlights] = useState({});

  if (showIntro) {
    return (
      <PartIntroScreen
        part={introData}
        sectionLabel={sectionLabelForIntro}
        audioSrc={currentPart.audio}
        onStart={() => setPartStarted(currentPart.number, true)}
        onExit={onExit}
        allowSkip={mode !== 'strict'}
      />
    );
  }

  if (!currentPart || !group) return null;

  // Within-part position (used for the footer "X–Y of N in part" indicator).
  let partPosition = 1;
  for (let i = 0; i < groupIndex; i++) partPosition += currentPart.groups[i].items.length;

  // Exam-wide question number for labels (Listening 1…N, Reading continues from there).
  let examOffset = 0;
  for (const p of examParts) {
    if (p.number === currentPart.number) break;
    examOffset += p.totalItems;
  }
  const runningNumber = examOffset + partPosition;

  // The short placement paper is a single self-contained test — no
  // "Section 1/2" framing, and its parts are the paper's own sections.
  const sectionLabel = version === 'short'
    ? 'Placement Test'
    : section === 'listening' ? 'Section 1 · Listening' : 'Section 2 · Reading';
  const partCrumb = version === 'short'
    ? currentPart.title
    : `Part ${currentPart.number} · ${currentPart.title}`;
  const crumbs = [{ text: sectionLabel }, { text: partCrumb, strong: true }];
  const nextLabel = atSectionEnd
    ? (section === 'listening' ? 'Finish Listening section' : 'Finish Reading section')
    : 'Next';
  const canGoPrevious = !isReading || !isFirstPart || !isFirstGroup;
  // Photographs are listening Part 1 only — a native-structure paper's first
  // part (e.g. the short paper's "Grammar A2") must not render a photo area.
  const isPhoto = section === 'listening' && !currentPart.showPassage && currentPart.number === 1;
  // Listening parts hide the transcript, so they don't need a split layout —
  // collapse Conversations (Part 3) and Short Talks (Part 4) into the same
  // single-column layout used by Photographs (Part 1).
  const splitLayout = currentPart.showPassage && section !== 'listening';
  // Reading is always free-paced with the navigator visible.
  const showNavigator = isReading || !strict;
  const freePaced = isReading || !strict;
  const contentColumns = splitLayout ? '1.1fr 1fr' : '1fr';
  const gridColumns = showNavigator
    ? contentColumns + ' ' + (navigatorOpen ? '260px' : '0px')
    : contentColumns;
  const sectionQuestionTiles = [];
  const sectionPartNumbers = new Set(parts.map((p) => p.number));
  let questionNumber = 1;
  examParts.forEach((part) => {
    const includePart = sectionPartNumbers.has(part.number);
    part.groups.forEach((questionGroup, groupIndexForTile) => {
      questionGroup.items.forEach((item) => {
        if (includePart) {
          sectionQuestionTiles.push({
            id: item.id,
            number: questionNumber,
            partNumber: part.number,
            groupIndex: groupIndexForTile,
            answered: !!answers[item.id],
            flagged: flagged.has(item.id),
          });
        }
        questionNumber += 1;
      });
    });
  });

  // In strict listening, gate the Next button behind a 0-countdown (auto-advance handles it).
  // Reading is always free-paced — Next/Prev work normally.
  // Highlight tools go with reading-comprehension passages, whichever part
  // number they carry (Part 7 on the full paper, native sections on the short).
  const readingToolsActive = isReading && currentPart.skill === 'reading' && !!group.passage;
  const readingAnnotationKey = `${currentPart.number}-${groupIndex}`;
  const currentReadingHighlights = readingHighlights[readingAnnotationKey] || [];
  const createReadingHighlight = ({ start, end, text, rect }) => {
    const id = `${readingAnnotationKey}-${Date.now()}`;
    setReadingHighlights((prev) => ({
      ...prev,
      [readingAnnotationKey]: [
        ...(prev[readingAnnotationKey] || []),
        { id, start, end, text: text.trim(), color: readingHighlightColor, comment: '' },
      ],
    }));
    setReadingCommentDraft('');
    setReadingPendingComment({ id, position: rect });
  };
  const removeReadingHighlight = (id) => {
    setReadingHighlights((prev) => ({
      ...prev,
      [readingAnnotationKey]: (prev[readingAnnotationKey] || []).filter((item) => item.id !== id),
    }));
    if (readingPendingComment?.id === id) setReadingPendingComment(null);
  };
  const saveReadingComment = () => {
    if (!readingPendingComment) return;
    setReadingHighlights((prev) => ({
      ...prev,
      [readingAnnotationKey]: (prev[readingAnnotationKey] || []).map((item) => (
        item.id === readingPendingComment.id
          ? { ...item, comment: readingCommentDraft.trim() }
          : item
      )),
    }));
    setReadingCommentDraft('');
    setReadingPendingComment(null);
  };
  const clearReadingHighlights = () => {
    setReadingHighlights((prev) => {
      const next = { ...prev };
      delete next[readingAnnotationKey];
      return next;
    });
    setReadingCommentDraft('');
    setReadingPendingComment(null);
  };
  // Strict listening still auto-advances, but candidates can skip the current
  // recording and move on immediately.
  const nextDisabled = false;

  return (
    <div className={`et et-screen${section === 'reading' ? ' et-screen--white' : ''}`}>
      <ETTopbar crumbs={crumbs} timer={<ExamClock />} onExit={onExit} />

      <AnnotationCommentPopover
        position={readingPendingComment?.position}
        value={readingCommentDraft}
        onChange={setReadingCommentDraft}
        onSave={saveReadingComment}
      />

      <div className="et-exam-grid" style={{ gridTemplateColumns: gridColumns }}>
        {/* MAIN */}
        {splitLayout ? (
          <>
            <div className="et-scroll et-exam-pane--passage">
              <PassageCard
                passage={group.passage}
                label={group.label}
                strict={section === 'listening'}
                highlights={readingToolsActive ? currentReadingHighlights : []}
                toolMode={readingToolMode}
                onCreateHighlight={readingToolsActive ? createReadingHighlight : undefined}
                onRemoveHighlight={readingToolsActive ? removeReadingHighlight : undefined}
              />
              {readingToolsActive && (
                <ReadingComprehensionTools
                  color={readingHighlightColor}
                  onColorChange={setReadingHighlightColor}
                  mode={readingToolMode}
                  onModeChange={setReadingToolMode}
                  highlights={currentReadingHighlights}
                  onClear={clearReadingHighlights}
                />
              )}
            </div>
            <div className="et-scroll et-exam-pane--questions">
              {group.items.map((it, i) => (
                <div key={it.id} style={{ marginBottom: 22, paddingBottom: 22, borderBottom: i === group.items.length - 1 ? '0' : '1px solid var(--gf-cloud-3)' }}>
                  <QuestionBlock item={it} number={runningNumber + i} showFlag={section !== 'listening'} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="et-scroll et-exam-pane--single">
            <div style={{ width: '100%', maxWidth: 760 }}>
              {isPhoto && <PhotographArea item={group.items[0]} />}
              {(() => {
                const audioOnly = section === 'listening' && (currentPart.number === 1 || currentPart.number === 2);
                const prompt = currentPart.number === 1
                  ? 'Listen to the four statements and choose the one that best describes the picture.'
                  : currentPart.number === 2
                    ? 'Choose the best response.'
                    : undefined;
                return group.items.map((it, i) => (
                  <QuestionBlock
                    key={it.id}
                    item={it}
                    number={runningNumber + i}
                    lettersOnly={audioOnly}
                    lettersOnlyPrompt={prompt}
                    showFlag={section !== 'listening'}
                  />
                ));
              })()}
            </div>
          </div>
        )}

        {/* RIGHT NAV - slides in from the right in free-paced mode */}
        {showNavigator && (
          <>
            {navigatorSheetOpen && (
              <button
                type="button"
                className="et-sheet-backdrop"
                aria-label="Close questions panel"
                onClick={(e) => { e.stopPropagation(); setNavigatorSheetOpen(false); }}
              />
            )}
            <aside
              className={[
                'et-side-panel',
                navigatorOpen ? 'et-side-panel--open' : 'et-side-panel--closed',
                'et-side-panel--sheet',
                navigatorSheetOpen ? 'et-side-panel--sheet-open' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="et-side-panel__handle" aria-hidden="true" />
              <button
                type="button"
                className="et-panel-toggle"
                aria-label={navigatorOpen ? 'Close question panel' : 'Open question panel'}
                title={navigatorOpen ? 'Close question panel' : 'Open question panel'}
                onClick={(e) => { e.stopPropagation(); setNavigatorOpen((open) => !open); }}
              >
                <span>{navigatorOpen ? ETIcon.arrowRight : ETIcon.arrowLeft}</span>
              </button>
              <div className="et-side-panel__content">
                <Eyebrow style={{ marginBottom: 10 }}>Questions</Eyebrow>
                <div className="et-qnav">
                  {sectionQuestionTiles.map((tile) => {
                    const cls = ['et-qnav__btn'];
                    if (tile.answered) cls.push('et-qnav__btn--answered');
                    if (tile.partNumber === currentPart.number && tile.groupIndex === position.groupIndex) cls.push('et-qnav__btn--current');
                    if (tile.flagged) cls.push('et-qnav__btn--flagged');
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        className={cls.join(' ')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPosition({ partNumber: tile.partNumber, groupIndex: tile.groupIndex });
                          setNavigatorSheetOpen(false);
                        }}
                      >
                        {tile.number}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
      <ETFootbar
        left={freePaced
          ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {canGoPrevious && <ETBtn kind="ghost" icon={ETIcon.arrowLeft} onClick={onPrev}>Previous</ETBtn>}
              {showNavigator && (
                <button
                  type="button"
                  className="et-btn et-btn--secondary et-btn--sm et-mobile-only"
                  onClick={(e) => { e.stopPropagation(); setNavigatorSheetOpen(true); }}
                  aria-label="Open question navigator"
                  style={{ gap: 6 }}
                >
                  <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{ETIcon.list}</span>
                  Questions {sectionQuestionTiles.filter((t) => t.answered).length}/{sectionQuestionTiles.length}
                </button>
              )}
            </div>
          )
          : null}
        center={
          listeningExamActive ? (
            <ExamAudioBar
              playing={examAudioPlaying}
              blocked={examAudioBlocked}
              ended={examAudioEnded}
            />
          ) : (
            <span>Please review every question before submitting.</span>
          )
        }
        right={
          freePaced ? (
            <ETBtn kind="primary" iconRight={ETIcon.arrowRight} onClick={onNext}>{nextLabel}</ETBtn>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {listeningExamActive && examAudioBlocked && (
                <button
                  type="button"
                  onClick={toggleExamAudio}
                  className="et-btn et-btn--secondary"
                  style={{ height: 36 }}
                >
                  <span style={{ width: 14, height: 14, display: 'inline-flex', marginRight: 6 }}>{ETIcon.play}</span>
                  Play audio
                </button>
              )}
              <CountdownCircle remaining={remaining} total={totalSeconds || postAudioSec} />
              <button
                type="button"
                disabled={nextDisabled}
                onClick={nextDisabled ? undefined : onNext}
                className="et-btn et-btn--primary"
                style={{ opacity: nextDisabled ? 0.55 : 1, cursor: nextDisabled ? 'not-allowed' : 'pointer' }}
              >
                {nextLabel}
                <span style={{ display: 'inline-flex', width: 16, height: 16 }}>{ETIcon.arrowRight}</span>
              </button>
            </div>
          )
        }
      />
      {showSubmitConfirm && (
        <SubmitConfirmModal
          unansweredCount={unanswered.length}
          onCancel={() => setShowSubmitConfirm(false)}
          onConfirm={confirmSubmit}
        />
      )}
    </div>
  );
}
