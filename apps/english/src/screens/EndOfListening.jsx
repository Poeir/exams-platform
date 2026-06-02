import React, { useEffect, useRef, useState } from 'react';
import { ETIcon, ETBtn, ETTopbar, ETAudioStatus } from '../components/Common.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import CountdownCircle from '../components/CountdownCircle.jsx';
import ExamClock from '../components/ExamClock.jsx';
import { useExam } from '../state/ExamContext.jsx';
import { withBase } from '../lib/base.js';

const END_VOICE_SRC = withBase('/voice/07_end_listening.mp3');
const POST_AUDIO_BUFFER_SEC = 3;

export default function EndOfListening({ onFlowNext, onExit }) {
  const { mode } = useExam();
  const strict = mode === 'strict';
  const allowSkip = !strict;

  const audioRef = useRef(null);
  const advancedRef = useRef(false);
  const [phase, setPhase] = useState('loading'); // 'loading' | 'playing' | 'buffer' | 'done'
  const [total, setTotal] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [blocked, setBlocked] = useState(false);

  const advance = () => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    try { audioRef.current?.pause(); } catch { /* ignore */ }
    setPhase('done');
    onFlowNext && onFlowNext();
  };

  useEffect(() => {
    const audio = new Audio(END_VOICE_SRC);
    audio.preload = 'auto';
    audioRef.current = audio;

    const onLoaded = () => {
      const dur = isFinite(audio.duration) ? audio.duration : 0;
      const t = dur + POST_AUDIO_BUFFER_SEC;
      setTotal(t);
      setRemaining(t);
    };
    const onPlay = () => { setBlocked(false); setPhase('playing'); };
    const onEnded = () => setPhase('buffer');

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('ended', onEnded);

    audio.play().catch(() => setBlocked(true));

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [strict]);

  // Tick the countdown
  useEffect(() => {
    if (!strict) return;
    if (phase === 'done') return;
    const id = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || total == null) return;
      if (phase === 'playing') {
        const left = Math.max(0, (audio.duration || 0) - audio.currentTime) + POST_AUDIO_BUFFER_SEC;
        setRemaining(left);
      } else if (phase === 'buffer') {
        setRemaining((r) => {
          const next = Math.max(0, (r ?? 0) - 0.2);
          if (next <= 0) advance();
          return next;
        });
      }
    }, 200);
    return () => clearInterval(id);
  }, [strict, phase, total]);

  const resume = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
  };

  const status = blocked
    ? 'Browser blocked autoplay — press play to continue.'
    : phase === 'loading'
      ? 'Loading announcement…'
      : phase === 'playing'
        ? 'This concludes the Listening section.'
        : phase === 'buffer'
          ? `Moving to Reading section in ${Math.ceil(remaining ?? 0)}…`
          : 'Continuing…';

  return (
    <div className="et et-screen et-screen--white">
      <ETTopbar
        crumbs={[{ text: 'Section 1 · Listening' }, { text: 'Complete', strong: true }]}
        timer={<ExamClock />}
        onExit={onExit}
      />

      <div style={{ flex: 1, padding: '32px 80px 24px', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 620 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Eyebrow brand style={{ marginBottom: 10 }}>Section transition</Eyebrow>
            <h1 className="et-display et-display--sm" style={{ marginBottom: 10 }}>End of Listening section</h1>
            <p style={{ fontSize: 15, color: 'var(--fg-3)', fontWeight: 500, margin: 0, lineHeight: 1.6 }}>
              Please listen to the closing announcement. The Reading section will begin automatically.
            </p>
          </div>

          <div className="et-card et-card--raised" style={{ padding: 36, textAlign: 'center' }}>
            <div style={{
              position: 'relative', width: 120, height: 120, margin: '0 auto 22px',
              borderRadius: 999, background: 'var(--color-primary-tint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ position: 'absolute', inset: -8, borderRadius: 999, border: '1px solid var(--color-primary-soft)' }} />
              <span style={{ position: 'absolute', inset: -20, borderRadius: 999, border: '1px solid var(--color-primary-soft)', opacity: 0.55 }} />
              <span style={{ width: 56, height: 56, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {ETIcon.check}
              </span>
            </div>

            <div style={{ fontSize: 14, color: 'var(--fg-3)', fontWeight: 600, marginBottom: 8 }}>Announcement</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 6 }}>{status}</div>
          </div>
        </div>
      </div>

      <footer className="et-footbar et-footbar--inline">
        <span aria-hidden="true" />
        <div className="et-footbar__center" style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
          {strict ? <ETAudioStatus status={status} active={phase === 'playing'} /> : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {blocked && strict && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); resume(); }}
              className="et-btn et-btn--secondary"
              style={{ height: 36 }}
            >
              <span style={{ width: 14, height: 14, display: 'inline-flex', marginRight: 6 }}>{ETIcon.play}</span>
              Play announcement
            </button>
          )}
          {strict && (
            <>
              <CountdownCircle remaining={remaining ?? 0} total={total ?? POST_AUDIO_BUFFER_SEC} size={44} />
              {allowSkip && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); advance(); }}
                  className="et-btn et-btn--ghost et-btn--sm"
                  style={{ fontSize: 11, opacity: 0.7 }}
                  title="Skip the announcement (dev)"
                >
                  Skip
                </button>
              )}
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="et-btn et-btn--primary"
                style={{ opacity: 0.55, cursor: 'not-allowed' }}
              >
                Continuing…
                <span style={{ display: 'inline-flex', width: 16, height: 16 }}>{ETIcon.arrowRight}</span>
              </button>
            </>
          )}
          {!strict && (
            <ETBtn kind="primary" iconRight={ETIcon.arrowRight} onClick={(e) => { e.stopPropagation(); advance(); }}>
              Continue to Reading
            </ETBtn>
          )}
        </div>
      </footer>
    </div>
  );
}
