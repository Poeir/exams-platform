// ============================================================
// Shared components: Mascot, Buttons, Progress, Icons
// ============================================================
import { withBase } from './lib/base.js';

export function Mascot({ name, size = 200, style }) {
  return (
    <img
      src={withBase(`/mascots/${name}.png`)}
      alt=""
      style={{ width: size, height: size, objectFit: 'contain', ...style }}
    />
  );
}

export function PrimaryButton({ children, onClick, disabled, large, style }) {
  return (
    <button
      className={`btn btn-primary${large ? ' btn-large' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, large, style, onDark }) {
  return (
    <button
      className={`btn btn-secondary${large ? ' btn-large' : ''}${onDark ? ' on-dark' : ''}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
}

export function Icon({ name, size = 20, color = 'currentColor' }) {
  const s = size;
  const c = color;
  const sw = 1.8;
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'arrow-right':
      return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'arrow-left':
      return <svg {...common}><path d="M19 12H5M11 5l-7 7 7 7"/></svg>;
    case 'check':
      return <svg {...common}><path d="M5 13l4 4L19 7"/></svg>;
    case 'sparkles':
      return <svg {...common}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z"/></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'play':
      return <svg {...common}><path d="M8 5l11 7-11 7V5z" fill={c}/></svg>;
    case 'copy':
      return <svg {...common}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>;
    case 'share':
      return <svg {...common}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>;
    case 'download':
      return <svg {...common}><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>;
    case 'users':
      return <svg {...common}><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5"/><path d="M15 14.5c2.5 0 6 1.5 6 4.5"/></svg>;
    case 'doc':
      return <svg {...common}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>;
    case 'lock':
      return <svg {...common}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>;
    case 'chat':
      return <svg {...common}><path d="M4 5h16v11H8l-4 4V5z"/></svg>;
    case 'target':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill={c}/></svg>;
    case 'flame':
      return <svg {...common}><path d="M12 3c1 3 5 5 5 9a5 5 0 01-10 0c0-2 1.5-3 1.5-5 1 2 2 2.5 3.5 1-1-2 0-3 0-5z"/></svg>;
    case 'wave':
      return <svg {...common}><path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/></svg>;
    case 'shield':
      return <svg {...common}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>;
    case 'bolt':
      return <svg {...common}><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/></svg>;
    case 'star':
      return <svg {...common}><path d="M12 3l2.7 5.5L21 9.3l-4.5 4.4 1 6.3L12 17l-5.5 3 1-6.3L3 9.3l6.3-.8L12 3z"/></svg>;
    case 'compass':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5L13 13l-3.5 1.5L11 11l3.5-1.5z"/></svg>;
    case 'home':
      return <svg {...common}><path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z"/></svg>;
    case 'eye':
      return <svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'info':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 10v6"/><path d="M12 7h.01"/></svg>;
    case 'puzzle':
      return <svg {...common}><path d="M9 4a2 2 0 014 0v2h3a2 2 0 012 2v3h-2a2 2 0 000 4h2v3a2 2 0 01-2 2h-3v-2a2 2 0 00-4 0v2H6a2 2 0 01-2-2v-3h2a2 2 0 000-4H4V8a2 2 0 012-2h3V4z"/></svg>;
    case 'refresh':
      return <svg {...common}><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5"/></svg>;
    default:
      return null;
  }
}

export function ProgressDots({ total, current }) {
  return (
    <div className="quiz-dots">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`quiz-dot${i < current ? ' done' : i === current ? ' current' : ''}`}
        />
      ))}
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast">
      <Icon name="check" size={18} />
      <span>{message}</span>
    </div>
  );
}

export function Loading({ title = 'กำลังประมวลผล', subtitle, mascot = 'lightbulb' }) {
  return (
    <div className="loading-wrap" role="status" aria-live="polite">
      <div className="loading-card">
        <div className="loading-mascot">
          <Mascot name={mascot} size={140} />
          <span className="loading-ring" aria-hidden="true"></span>
        </div>
        <h2 className="loading-title">{title}</h2>
        {subtitle && <p className="loading-sub">{subtitle}</p>}
        <div className="loading-dots" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  );
}
