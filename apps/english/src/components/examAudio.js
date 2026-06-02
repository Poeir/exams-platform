// Shared audio helpers for the strict-mode exam flow.
// Lives in its own module so ExamSection and Instructions can both import without
// creating a circular dependency through LISTENING_PARTS.

export const POST_AUDIO_BUFFER_SEC = 5;
const PRE_AUDIO_BEEP_SEC = 2;

// Synthesize an airy two-tone "modern notification" chime using Web Audio API.
// Two pure sines staggered, each with a long bell-like exponential decay —
// the staggered onset makes it feel like a gentle ding-dong instead of a held tone.
export function playStartBeep(durationSec = PRE_AUDIO_BEEP_SEC) {
  return new Promise((resolve) => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { resolve(); return; }
    let ctx;
    try { ctx = new Ctx(); } catch { resolve(); return; }

    const now = ctx.currentTime;

    const chime = (freq, startOffset, peakGain, decaySec) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + startOffset);
      g.gain.linearRampToValueAtTime(peakGain, now + startOffset + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + decaySec);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + decaySec + 0.05);
    };

    chime(2093, 0.00, 0.13, 1.5);  // C7
    chime(3136, 0.00, 0.04, 1.2);  // G7 — gentle air, very quiet
    chime(1397, 0.55, 0.12, 1.6);  // F6
    chime(2093, 0.55, 0.04, 1.3);  // C7 octave shimmer, very quiet

    setTimeout(() => {
      try { ctx.close(); } catch { /* ignore */ }
      resolve();
    }, Math.ceil((durationSec + 0.1) * 1000));
  });
}
