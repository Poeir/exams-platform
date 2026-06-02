import React, { useEffect, useRef, useState } from 'react';
import { ETIcon, ETBtn, ETTopbar } from '../components/Common.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import ExamClock from '../components/ExamClock.jsx';
import { withBase } from '../lib/base.js';

const TEST_VOICE_SRC = withBase('/voice/01voice_test.mp3');

function TestVoiceButton() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(TEST_VOICE_SRC);
    audioRef.current = audio;
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.currentTime = 0;
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const icon = isPlaying ? ETIcon.pause : ETIcon.play;
  return (
    <button
      type="button"
      className="et-audio__play"
      onClick={handleClick}
      aria-label={isPlaying ? 'Pause sample audio' : 'Play sample audio'}
      style={{ width: 72, height: 72, margin: '0 auto 16px' }}
    >
      <span style={{ width: 28, height: 28, display: 'inline-flex' }}>
        {React.cloneElement(icon, { style: { width: '100%', height: '100%' } })}
      </span>
    </button>
  );
}

function HeadphonesIllustration() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto', borderRadius: 999, background: 'var(--color-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ position: 'absolute', inset: -8, borderRadius: 999, border: '1px solid var(--color-primary-soft)' }} />
      <span style={{ position: 'absolute', inset: -20, borderRadius: 999, border: '1px solid var(--color-primary-soft)', opacity: 0.55 }} />
      <span style={{ width: 56, height: 56, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{ETIcon.headphones}</span>
    </div>
  );
}

function ConfirmActions({ onBack, onYes }) {
  const handleBack = (e) => {
    e.stopPropagation();
    onBack();
  };
  const handleYes = (e) => {
    e.stopPropagation();
    onYes();
  };
  return (
    <div style={{ borderTop: '1px solid var(--gf-cloud-3)', paddingTop: 22 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 18 }}>Can you hear the sound clearly?</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <ETBtn kind="secondary" size="lg" onClick={handleBack}>Back to home</ETBtn>
        <ETBtn kind="primary" size="lg" iconRight={ETIcon.arrowRight} onClick={handleYes}>Yes, continue</ETBtn>
      </div>
    </div>
  );
}

function TroubleshootingModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const stop = (e) => e.stopPropagation();
  const handleClose = (e) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="et-troubleshooting-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483645,
        background: 'rgba(17, 17, 21, 0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div className="et-card et-card--raised et-modal" onClick={stop}>
        <h2 id="et-troubleshooting-title" style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, color: 'var(--fg-1)' }}>
          Cannot hear the sample?
        </h2>
        <ol style={{ margin: '0 0 22px', paddingLeft: 20, color: 'var(--fg-2)', fontSize: 14, fontWeight: 500, lineHeight: 1.7 }}>
          <li>Check that your speakers or headphones are connected.</li>
          <li>Increase your device and browser volume, then press Play again.</li>
          <li>Confirm this browser tab is not muted and that the correct output device is selected.</li>
        </ol>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ETBtn kind="secondary" size="lg" onClick={handleClose}>Close guide</ETBtn>
        </div>
      </div>
    </div>
  );
}

function StartConfirmModal({ onCancel, onConfirm }) {
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
      aria-labelledby="et-start-confirm-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483645,
        background: 'rgba(17, 17, 21, 0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="et-card et-card--raised et-modal"
        onClick={stop}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 999,
            background: 'var(--color-primary-tint)', color: 'var(--color-primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ width: 22, height: 22, display: 'inline-flex' }}>{ETIcon.clock}</span>
          </span>
          <h2 id="et-start-confirm-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--fg-1)' }}>
            Start the test?
          </h2>
        </div>

        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)', fontWeight: 500, lineHeight: 1.6 }}>
          Once you continue, the timer starts immediately and you will not be able to return to this screen. Make sure you are ready before confirming.
        </p>

        <ul style={{ margin: '14px 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'The countdown begins as soon as you confirm.',
            'You cannot pause, restart, or go back to earlier screens.',
            'Your answers are saved automatically as you progress.',
          ].map((line) => (
            <li key={line} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--fg-2)', fontWeight: 500, lineHeight: 1.5 }}>
              <span style={{
                marginTop: 2, width: 16, height: 16, flexShrink: 0,
                borderRadius: 999, background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ width: 10, height: 10, display: 'inline-flex' }}>{ETIcon.check}</span>
              </span>
              {line}
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <ETBtn kind="secondary" size="lg" onClick={handleCancel}>Not yet</ETBtn>
          <ETBtn kind="primary" size="lg" iconRight={ETIcon.arrowRight} onClick={handleConfirm}>
            Yes, I'm ready
          </ETBtn>
        </div>
      </div>
    </div>
  );
}

export default function AudioCheck({ onFlowNext, onFlowPrev, onExit }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const handleOpenTroubleshooting = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setShowTroubleshooting(true);
  };

  return (
    <div className="et et-screen">
      <ETTopbar
        crumbs={[{ text: 'Setup' }, { text: 'Audio check', strong: true }]}
        timer={<ExamClock />}
        onExit={onExit}
      />

      <div className="et-audio-check" style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 620 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 className="et-display et-display--sm" style={{ marginBottom: 10 }}>Audio check</h1>
            <p style={{ fontSize: 15, color: 'var(--fg-3)', fontWeight: 500, margin: 0, lineHeight: 1.6 }}>
              Please verify your sound settings before you begin. The Listening section depends on clear audio playback.
            </p>
          </div>

          <div className="et-card et-card--raised" style={{ padding: 36, textAlign: 'center' }}>
            <HeadphonesIllustration />

            <div style={{ fontSize: 14, color: 'var(--fg-3)', fontWeight: 600, marginTop: 18, marginBottom: 8 }}>Sample recording</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 22 }}>Listen to the sample audio...</div>

            <TestVoiceButton />
            <div style={{ fontSize: 13, color: 'var(--fg-3)', fontWeight: 600, marginBottom: 28 }}>Press play to test your speakers or headphones</div>

            <ConfirmActions onBack={() => onFlowPrev && onFlowPrev()} onYes={() => setShowConfirm(true)} />
          </div>

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: 'var(--fg-4)', fontWeight: 500, lineHeight: 1.6 }}>
            Trouble hearing the audio?{' '}
            <button
              type="button"
              onClick={handleOpenTroubleshooting}
              style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--color-primary)', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}
            >
              Open the troubleshooting guide
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <StartConfirmModal
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => { setShowConfirm(false); onFlowNext && onFlowNext(); }}
        />
      )}
      {showTroubleshooting && (
        <TroubleshootingModal onClose={() => setShowTroubleshooting(false)} />
      )}
    </div>
  );
}
