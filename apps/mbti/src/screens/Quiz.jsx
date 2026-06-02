import { useState, useEffect, useMemo, useRef } from 'react';
import { Icon, PrimaryButton, ProgressDots } from '../components.jsx';
import { buildPath } from '../lib/quizPath.js';
import {
  evenDistribution,
  moveBoundary,
  pointerAngleFraction,
  sliceCumulative,
} from '../lib/donutMath.js';

export function Quiz({ answers, setAnswers, onComplete, onBack }) {
  const path = useMemo(() => buildPath(answers), [answers]);
  const [currentId, setCurrentId] = useState(path[0]?.id);

  useEffect(() => {
    if (!path.find(q => q.id === currentId)) {
      const answeredIdx = path.findIndex(q => !answers[q.id]);
      setCurrentId(path[Math.max(0, answeredIdx)]?.id || path[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const currentIdx = path.findIndex(q => q.id === currentId);
  const q = path[currentIdx];
  const totalQuestions = path.length;
  const answer = answers[q?.id];

  const goNext = () => {
    const newPath = buildPath(answers);
    const idx = newPath.findIndex(qq => qq.id === q.id);
    const next = newPath[idx + 1];
    if (next) setCurrentId(next.id);
    else onComplete();
  };

  const goPrev = () => {
    if (currentIdx > 0) {
      setCurrentId(path[currentIdx - 1].id);
    } else {
      onBack();
    }
  };

  const onAnswer = (ans) => {
    setAnswers({ ...answers, [q.id]: ans });
  };

  if (!q) return null;

  const isAnswered = answer != null;
  const isLast = currentIdx === totalQuestions - 1;

  return (
    <div className="quiz-wrap">
      <div className="quiz-top">
        <ProgressDots total={totalQuestions} current={currentIdx} />
        <div className="quiz-meta">
          <strong>{currentIdx + 1}</strong> / {totalQuestions}
          <span style={{ marginLeft: 8, opacity: 0.6 }}>· {q.label}</span>
        </div>
      </div>

      <div className="quiz-card" key={q.id}>
        <div className="quiz-scenario-label">
          <Icon name="target" size={14} />
          <span>สถานการณ์</span>
        </div>
        <h2 className="quiz-scenario-title">{q.title}</h2>

        {q.format === 'mcq' && (
          <McqQuestion q={q} answer={answer} onAnswer={onAnswer} />
        )}
        {q.format === 'chat' && (
          <ChatQuestion q={q} answer={answer} onAnswer={onAnswer} />
        )}
        {q.format === 'slider' && (
          <SliderQuestion q={q} answer={answer} onAnswer={onAnswer} />
        )}

        <div className="quiz-nav">
          <button className="btn-link" onClick={goPrev}>
            <Icon name="arrow-left" size={16} /> ก่อนหน้า
          </button>
          <div className="spacer"></div>
          <PrimaryButton onClick={goNext} disabled={!isAnswered}>
            {isLast ? 'ดูผลลัพธ์' : 'ถัดไป'}
            <Icon name="arrow-right" size={16} />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function McqQuestion({ q, answer, onAnswer }) {
  return (
    <div>
      {q.context && <div className="quiz-scenario-context">{q.context}</div>}
      <div className="quiz-prompt">{q.prompt}</div>
      <div className="quiz-options">
        {q.options.map((opt, idx) => (
          <button
            key={opt.id}
            className={`quiz-option${answer?.optionId === opt.id ? ' selected' : ''}`}
            onClick={() => onAnswer({ optionId: opt.id, w: opt.w, next: opt.next })}
          >
            <span className="quiz-option-letter">{'ABCD'[idx]}</span>
            <span>{opt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatQuestion({ q, answer, onAnswer }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
    const timers = [];
    q.chatThread.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 400 + i * 600));
    });
    return () => timers.forEach(clearTimeout);
  }, [q.id]);

  return (
    <div>
      <div className="quiz-chat">
        {q.chatThread.slice(0, revealed).map((msg, i) => (
          <div className="chat-bubble them-avatar" key={i}>
            <div className="avatar">{msg.initials}</div>
            <div className="body">
              {i === 0 && <div className="sender">{msg.from}</div>}
              {msg.text}
            </div>
          </div>
        ))}
        {revealed < q.chatThread.length && (
          <div className="chat-bubble them-avatar">
            <div className="avatar">{q.chatThread[revealed].initials}</div>
            <div className="body" style={{ display: 'flex', gap: 4, padding: '14px 18px' }}>
              <Dot delay={0} /><Dot delay={150} /><Dot delay={300} />
            </div>
          </div>
        )}
      </div>

      {revealed >= q.chatThread.length && (
        <>
          <div className="chat-replies-label">
            <Icon name="chat" size={14} />
            <span>เลือกข้อความที่คุณจะตอบกลับ</span>
          </div>
          <div className="chat-replies">
            {q.options.map((opt) => (
              <button
                key={opt.id}
                className={`chat-reply${answer?.optionId === opt.id ? ' selected' : ''}`}
                onClick={() => onAnswer({ optionId: opt.id, w: opt.w })}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Dot({ delay }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: 999,
      background: 'var(--color-anchor)',
      display: 'inline-block',
      animation: `bounce 1s ${delay}ms infinite ease-in-out`,
      opacity: 0.6,
    }} />
  );
}

const SLIDER_COLORS = ['#F05B2F', '#1C1C22', '#21CE9B', '#F7CA51'];

function SliderQuestion({ q, answer, onAnswer }) {
  const initial = useMemo(
    () => answer?.distribution || evenDistribution(q.actions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.id],
  );

  const [dist, setDist] = useState(initial);

  useEffect(() => { setDist(initial); }, [q.id, initial]);

  useEffect(() => {
    onAnswer({ distribution: dist, options: q.actions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dist]);

  return (
    <div>
      {q.context && <div className="quiz-scenario-context">{q.context}</div>}
      <div className="slider-intro">
        <Icon name="bolt" size={18} />
        <span>{q.prompt} <strong>ลากจุดบนวงกลม</strong> เพื่อแบ่งสัดส่วน 100 คะแนน</span>
      </div>

      <DonutPicker actions={q.actions} dist={dist} setDist={setDist} />
    </div>
  );
}

function DonutPicker({ actions, dist, setDist }) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const cx = 130;
  const cy = 130;
  const r = 88;
  const strokeWidth = 32;
  const circumference = 2 * Math.PI * r;
  const labelR = 168; // distance (in board px) from donut center to flag anchor

  const ids = actions.map(a => a.id);
  const { sizes, cum } = sliceCumulative(actions, dist);

  const onHandleDown = (handleIdx, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(handleIdx);
  };

  useEffect(() => {
    if (dragging === null) return;
    const handleMove = (e) => {
      const frac = pointerAngleFraction(e, svgRef.current);
      if (frac == null) return;
      setDist(current => moveBoundary(current, ids, dragging, frac));
    };
    const handleUp = () => setDragging(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  return (
    <div className="donut-board">
      <svg
        ref={svgRef}
        className="donut-picker"
        viewBox="0 0 260 260"
        style={{ touchAction: 'none' }}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-cloud)" strokeWidth={strokeWidth} />
        {actions.map((a, i) => {
          const pct = sizes[i];
          if (pct === 0) return null;
          const dashLength = pct * circumference;
          const offset = -cum[i] * circumference;
          return (
            <circle
              key={a.id}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={SLIDER_COLORS[i]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                transition: dragging === null
                  ? 'stroke-dasharray 180ms cubic-bezier(0.4,0,0.2,1), stroke-dashoffset 180ms cubic-bezier(0.4,0,0.2,1)'
                  : 'none',
              }}
            />
          );
        })}
        <text x={cx} y={cy + 4} className="donut-picker-total" textAnchor="middle">100</text>
        <text x={cx} y={cy + 26} className="donut-picker-label" textAnchor="middle">คะแนน</text>
        {/* Letter rendered on top of each slice */}
        {actions.map((a, i) => {
          const pct = sizes[i];
          if (pct < 0.05) return null;
          const midPct = cum[i] + pct / 2;
          const ang = midPct * 2 * Math.PI - Math.PI / 2;
          const tx = cx + r * Math.cos(ang);
          const ty = cy + r * Math.sin(ang);
          return (
            <text
              key={`L${a.id}`}
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="central"
              className="donut-slice-letter"
            >
              {'ABCD'[i]}
            </text>
          );
        })}
        {[1, 2, 3].map(handleIdx => {
          const angle = cum[handleIdx] * 2 * Math.PI - Math.PI / 2;
          const hx = cx + r * Math.cos(angle);
          const hy = cy + r * Math.sin(angle);
          const isDragging = dragging === handleIdx;
          return (
            <g
              key={handleIdx}
              className={`donut-handle${isDragging ? ' is-dragging' : ''}`}
              onPointerDown={(e) => onHandleDown(handleIdx, e)}
            >
              <circle cx={hx} cy={hy} r={20} fill="transparent" />
              <circle className="donut-handle-ring" cx={hx} cy={hy} r={12} fill="white" stroke="var(--color-charcoal)" strokeWidth={2.5} />
              <circle className="donut-handle-dot" cx={hx} cy={hy} r={3.5} fill="var(--color-charcoal)" />
            </g>
          );
        })}
      </svg>
      {/* Floating flag for each slice — positioned at the slice's angular midpoint */}
      {actions.map((a, i) => {
        const midPct = cum[i] + sizes[i] / 2;
        const angRad = (midPct * 360 - 90) * Math.PI / 180;
        const dx = Math.cos(angRad) * labelR;
        const dy = Math.sin(angRad) * labelR;
        return (
          <div
            key={`F${a.id}`}
            className="donut-flag"
            style={{
              left: `calc(50% + ${dx}px)`,
              top: `calc(50% + ${dy}px)`,
              borderLeftColor: SLIDER_COLORS[i],
            }}
          >
            <div className="donut-flag-head">
              <span className="donut-flag-letter" style={{ background: SLIDER_COLORS[i] }}>
                {'ABCD'[i]}
              </span>
              <span className="donut-flag-pct">{dist[a.id]}%</span>
            </div>
            <div className="donut-flag-text">{a.text}</div>
          </div>
        );
      })}
    </div>
  );
}
