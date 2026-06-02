import React from 'react';
import { ETTimer, formatClock } from './Common.jsx';
import { useExamCountdown } from '../state/ExamContext.jsx';

// The single test-wide clock, shown in the topbar of every test screen.
// Before the test starts it displays the full duration, dimmed and idle; once
// the candidate begins, it counts down continuously and flags the final 5
// minutes. "Time's up" navigation to Results is handled centrally in App.jsx.
export default function ExamClock() {
  const { remaining, started } = useExamCountdown();
  return (
    <span style={started ? undefined : { opacity: 0.5 }}>
      <ETTimer time={formatClock(remaining)} warn={started && remaining <= 300} />
    </span>
  );
}
