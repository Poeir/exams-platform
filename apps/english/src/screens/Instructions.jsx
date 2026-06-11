import React, { useEffect, useRef, useState } from 'react';
import { ETIcon, ETBtn, ETTopbar, ETAudioStatus } from '../components/Common.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import SampleQuestion from '../components/SampleQuestion.jsx';
import CountdownCircle from '../components/CountdownCircle.jsx';
import ExamClock from '../components/ExamClock.jsx';
import { POST_AUDIO_BUFFER_SEC, playStartBeep } from '../components/examAudio.js';
import { useExam } from '../state/ExamContext.jsx';
import { withBase } from '../lib/base.js';

const LISTENING_DIRECTIONS_SRC = withBase('/voice/02_reading_comprehension.mp3');

function useStrictListeningDirections({ enabled, onComplete }) {
  const audioRef = useRef(null);
  const advancedRef = useRef(false);
  const [phase, setPhase] = useState('beep'); // 'beep' | 'loading' | 'playing' | 'buffer' | 'done'
  const [total, setTotal] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    advancedRef.current = false;
    setPhase('beep');
    setTotal(null);
    setRemaining(null);
    setPlaying(false);
    setBlocked(false);

    const audio = new Audio(LISTENING_DIRECTIONS_SRC);
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
      setRemaining(Math.max(0, dur - audio.currentTime + POST_AUDIO_BUFFER_SEC));
    };
    const onPlay  = () => { setPlaying(true); setBlocked(false); setPhase('playing'); };
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setPhase('buffer'); };

    audio.addEventListener('loadedmetadata', onMetadata);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    playStartBeep().then(() => {
      if (cancelled) return;
      setPhase('loading');
      audio.play().catch(() => setBlocked(true));
    });

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMetadata);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (phase !== 'buffer') return undefined;
    if (remaining == null || remaining <= 0) return undefined;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, (r ?? 0) - 0.2));
    }, 200);
    return () => clearInterval(id);
  }, [enabled, phase, remaining != null, remaining > 0]);

  useEffect(() => {
    if (!enabled) return;
    if (remaining === null || remaining > 0) return;
    if (advancedRef.current) return;
    advancedRef.current = true;
    setPhase('done');
    const t = setTimeout(() => onComplete?.(), 0);
    return () => clearTimeout(t);
    // phase is intentionally excluded — setPhase('done') below would otherwise
    // re-trigger this effect and its cleanup would clearTimeout before it fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, remaining, onComplete]);

  const resume = (e) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
  };

  const skip = (e) => {
    e?.stopPropagation();
    if (advancedRef.current) return;
    advancedRef.current = true;
    try {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    } catch {
      // Ignore browser audio edge cases while skipping the directions.
    }
    setPlaying(false);
    setBlocked(false);
    setPhase('done');
    onComplete?.();
  };

  return { phase, total, remaining, playing, blocked, resume, skip };
}

function ListeningDirectionsBanner({ phase, playing, blocked, remaining }) {
  const status = blocked
    ? 'Browser blocked autoplay — press play to start.'
    : phase === 'beep'
      ? 'Get ready…'
      : phase === 'loading'
        ? 'Loading directions audio…'
        : phase === 'playing'
          ? 'Now playing — read along while listening.'
          : phase === 'buffer'
            ? `Listening section starts in ${Math.ceil(remaining ?? 0)}…`
            : 'Starting Listening section…';

  return <ETAudioStatus status={status} active={playing} />;
}

export const LISTENING_PARTS = [
  {
    number: 1,
    title: 'Photographs',
    icon: ETIcon.photo,
    directions:
      'In this part, you will listen to four statements about a photograph. Choose the statement that best describes what you see in the picture.',
    cue: 'Look at the picture marked number 1.',
    sample: {
      eyebrow: 'Example',
      prompt: 'Look at the picture marked number 1.',
      // Azure blob name; resolved to /api/media/<name> at render via resolveMediaUrl.
      imageUrl: 'instructions-part1-example.png',
      options: [
        { l: 'A', t: 'The man is carrying a box.', selected: true },
        { l: 'B', t: 'The man is sitting at a desk.' },
        { l: 'C', t: 'The man is opening a window.' },
        { l: 'D', t: 'The man is talking on the phone.' },
      ],
      answerNote: 'The best answer is A.',
    },
  },
  {
    number: 2,
    title: 'Question–Response',
    icon: ETIcon.helpCircle,
    directions:
      'In this part, you will listen to a question or statement followed by three responses. Choose the response that best answers the question or statement.',
    cue: 'Where is the meeting being held?',
    sample: {
      eyebrow: 'Example',
      prompt: 'Where is the meeting being held?',
      options: [
        { l: 'A', t: 'In the main conference room.', selected: true },
        { l: 'B', t: 'At three o’clock this afternoon.' },
        { l: 'C', t: 'Because the manager is away.' },
      ],
      answerNote: 'The best answer is A.',
    },
  },
  {
    number: 3,
    title: 'Conversations',
    icon: ETIcon.list,
    directions:
      'In this part, you will listen to a conversation between two or more speakers. After the conversation, you will answer three questions based on what you heard.',
    cue: null,
    sample: {
      eyebrow: 'Example',
      prompt: 'What are the speakers mainly discussing?',
      options: [
        { l: 'A', t: 'A business trip' },
        { l: 'B', t: 'A project deadline', selected: true },
        { l: 'C', t: 'A customer complaint' },
        { l: 'D', t: 'A training session' },
      ],
      answerNote: 'The best answer is B.',
    },
  },
  {
    number: 4,
    title: 'Short Talks',
    icon: ETIcon.volume,
    directions:
      'In this part, you will listen to a short talk given by one speaker. After the talk, you will answer three questions based on what you heard.',
    cue: null,
    sample: {
      eyebrow: 'Example',
      prompt: 'What is the purpose of the announcement?',
      options: [
        { l: 'A', t: 'To introduce a new employee' },
        { l: 'B', t: 'To describe a travel schedule' },
        { l: 'C', t: 'To explain a change in office hours', selected: true },
        { l: 'D', t: 'To invite employees to a meeting' },
      ],
      answerNote: 'The best answer is C.',
    },
  },
];

export const READING_PARTS = [
  {
    number: 5,
    title: 'Vocabulary',
    icon: ETIcon.bookmark,
    directions:
      'In this part, a word or phrase is missing in each sentence. Read each sentence carefully and choose the option that best completes it.',
    cue: null,
    sample: {
      eyebrow: 'Example',
      prompt: 'The marketing team has been asked to ___ their quarterly performance report by Friday afternoon.',
      options: [
        { l: 'A', t: 'submit', selected: true },
        { l: 'B', t: 'distribute' },
        { l: 'C', t: 'produce' },
        { l: 'D', t: 'receive' },
      ],
      answerNote: 'The best answer is A.',
    },
  },
  {
    number: 6,
    title: 'Grammar',
    icon: ETIcon.pen,
    directions:
      'In this part, each sentence has a blank with four possible answers. Choose the option that is grammatically correct and best completes the sentence.',
    cue: null,
    sample: {
      eyebrow: 'Example',
      prompt: 'If the shipment ___ on time, we would have met the deadline.',
      options: [
        { l: 'A', t: 'arrives' },
        { l: 'B', t: 'arrived' },
        { l: 'C', t: 'had arrived', selected: true },
        { l: 'D', t: 'would arrive' },
      ],
      answerNote: 'The best answer is C.',
    },
  },
  {
    number: 7,
    title: 'Reading Comprehension',
    icon: ETIcon.book,
    directions:
      'In this part, you will read a selection of texts — such as e-mails, notices, articles, and short passages — followed by several questions. Choose the best answer to each question based on what is stated or implied in the text.',
    cue: null,
    sample: {
      eyebrow: 'Example',
      prompt: 'What is the main purpose of the e-mail?',
      options: [
        { l: 'A', t: 'To confirm a meeting time', selected: true },
        { l: 'B', t: 'To request a refund' },
        { l: 'C', t: 'To announce a new policy' },
        { l: 'D', t: 'To apologize for a delay' },
      ],
      answerNote: 'The best answer is A.',
    },
  },
];

const VARIANTS = {
  listening: {
    crumbs: [{ text: 'Test' }, { text: 'Section 1 · Listening', strong: true }],
    eyebrow: 'Section 1 of 2 · Listening',
    title: 'Listening Comprehension',
    icon: ETIcon.headphones,
    description:
      "Welcome to the Listening Comprehension section. In this section, you will listen to spoken English in a variety of situations and answer questions based on what you hear. Please listen carefully, as each audio clip will be played only once. Make sure your headphones or speakers are working properly and that the volume is comfortable. The Listening Comprehension test will begin now.",
    sample: {
      eyebrow: 'Sample question',
      prompt: 'Where most likely are the speakers?',
      options: [
        { l: 'A', t: 'At a hotel reception desk' },
        { l: 'B', t: 'In a restaurant', selected: true },
        { l: 'C', t: 'At a travel agency' },
        { l: 'D', t: 'At an airport check-in counter' },
      ],
    },
    tip: 'Scan the questions and answer choices while the conversation plays. Listen for keywords that link a speaker\'s words to one of the options.',
    footerCenter: <><strong>Audio device check passed.</strong> Headphones detected — volume at 70%.</>,
    nextLabel: 'Start Listening section',
  },
  reading: {
    crumbs: [{ text: 'Test' }, { text: 'Section 2 · Reading', strong: true }],
    eyebrow: 'Section 2 of 2 · Reading',
    title: 'Reading Comprehension',
    icon: ETIcon.book,
    description:
      'You will read sentences, short texts, and longer passages, then answer questions about them. Reading is self-paced — manage your time so you can attempt every question before the section ends.',
    sample: {
      eyebrow: 'Sample question',
      prompt: 'The marketing team has been asked to ___ their quarterly performance report by Friday afternoon.',
      options: [
        { l: 'A', t: 'submit', selected: true },
        { l: 'B', t: 'distribute' },
        { l: 'C', t: 'produce' },
        { l: 'D', t: 'receive' },
      ],
    },
    tip: 'Read the question first, then scan the passage for the relevant section. Eliminate options that contradict the text before choosing your answer.',
    footerCenter: <>The Listening section is complete. <strong>The test timer is still running.</strong></>,
    nextLabel: 'Next',
  },
};

function RulesPanel({ data }) {
  return (
    <div className="et-intro-pane--left">
      {data.icon && (
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
          {data.icon}
        </span>
      )}
      <Eyebrow brand style={{ marginBottom: 8 }}>{data.eyebrow}</Eyebrow>
      <h1 className="et-display et-display--sm" style={{ marginBottom: 12 }}>{data.title}</h1>
      <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--fg-2)', fontWeight: 500, marginBottom: 0, marginTop: 0 }}>
        {data.description}
      </p>
    </div>
  );
}

function ExamplePanel({ data }) {
  return (
    <div className="et-intro-pane--right">
      <div style={{ marginBottom: 16 }}><span className="et-chip et-chip--brand">Example</span></div>

      <SampleQuestion
        prompt={data.sample.prompt}
        options={data.sample.options}
      />
    </div>
  );
}

// The short placement paper is one self-contained Grammar + Reading test, so
// its instructions drop the full test's "Section 2 of 2" framing.
const SHORT_READING_OVERRIDES = {
  crumbs: [{ text: 'Placement Test' }, { text: 'Instructions', strong: true }],
  eyebrow: 'Quick Placement Test',
  title: 'Grammar & Reading',
  description:
    'You will answer grammar questions and read short workplace texts, then answer questions about them. The test is self-paced — manage your time so you can attempt every question before time runs out.',
};

function Instructions({ variant = 'listening', onFlowNext, onFlowPrev, onExit }) {
  const base = VARIANTS[variant] || VARIANTS.listening;
  const { mode, version } = useExam();
  const data = variant === 'reading' && version === 'short'
    ? { ...base, ...SHORT_READING_OVERRIDES }
    : base;
  const autoplayDirections = variant === 'listening' && mode === 'strict';
  const allowPrevious = variant !== 'reading' && !autoplayDirections;

  const handlePrevious = (e) => {
    e.stopPropagation();
    onFlowPrev?.();
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (autoplayDirections) {
      dir.skip(e);
      return;
    }
    onFlowNext?.();
  };

  const handleExit = (e) => {
    e.stopPropagation();
    onExit?.();
  };

  const dir = useStrictListeningDirections({
    enabled: autoplayDirections,
    onComplete: onFlowNext,
  });

  // The short (reading-only) version has no Listening section, so the reading
  // footer can't claim it is "complete" — the clock also STARTS here for short.
  const staticFooterCenter = variant === 'reading' && version === 'short'
    ? (<><strong>The test timer is running.</strong></>)
    : data.footerCenter;

  const footerCenter = autoplayDirections ? (
    <ListeningDirectionsBanner
      phase={dir.phase}
      playing={dir.playing}
      blocked={dir.blocked}
      remaining={dir.remaining}
    />
  ) : variant === 'listening' ? (
    // Match the rest of the Listening flow (EndOfListening + the question
    // screens): the footer always carries the audio-status wave — resting when
    // nothing is playing — instead of a bare line of text.
    <ETAudioStatus status={data.footerCenter} active={false} />
  ) : staticFooterCenter;

  const footerRight = autoplayDirections ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {dir.blocked && (
        <button
          type="button"
          onClick={dir.resume}
          className="et-btn et-btn--secondary"
          style={{ height: 36 }}
        >
          <span style={{ width: 14, height: 14, display: 'inline-flex', marginRight: 6 }}>{ETIcon.play}</span>
          Play directions
        </button>
      )}
      <CountdownCircle
        remaining={dir.remaining ?? 0}
        total={dir.total ?? POST_AUDIO_BUFFER_SEC}
        size={44}
      />
      <button
        type="button"
        onClick={handleNext}
        className="et-btn et-btn--primary"
      >
        {data.nextLabel}
        <span style={{ display: 'inline-flex', width: 16, height: 16 }}>{ETIcon.arrowRight}</span>
      </button>
    </div>
  ) : (
    <ETBtn kind="primary" iconRight={ETIcon.arrowRight} onClick={handleNext}>{data.nextLabel}</ETBtn>
  );

  return (
    <div className="et et-screen et-screen--white">
      <ETTopbar crumbs={data.crumbs} timer={<ExamClock />} onExit={handleExit} />

      <div className="et-intro-grid">
        <RulesPanel data={data} />
        <ExamplePanel data={data} />
      </div>

      <footer className="et-footbar et-footbar--inline">
        <div>
          {allowPrevious
            ? <ETBtn kind="ghost" icon={ETIcon.arrowLeft} onClick={handlePrevious}>Previous</ETBtn>
            : <span aria-hidden="true" />}
        </div>
        <div className="et-footbar__center" style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
          {footerCenter}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
          {footerRight}
        </div>
      </footer>
    </div>
  );
}

export default Instructions;

export function InstructionsListening(props) {
  return <Instructions variant="listening" {...props} />;
}

export function InstructionsReading(props) {
  return <Instructions variant="reading" {...props} />;
}
