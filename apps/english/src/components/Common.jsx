import React from 'react';
import { withBase } from '../lib/base.js';

export const ETIcon = {
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>,
  play: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 001.55.83l10-6.5a1 1 0 000-1.66l-10-6.5A1 1 0 008 5.5z"/></svg>,
  pause: <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>,
  rewind: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.36 2.64L3 8"/><polyline points="3 3 3 8 8 8"/></svg>,
  volume: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M16.5 8.5a5 5 0 010 7M19.5 5.5a9 9 0 010 13"/></svg>,
  flag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V4h13l-2 4 2 4H4"/></svg>,
  flagFilled: <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M4 21V4h13l-2 4 2 4H4z"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 12 10 17 19 7"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  arrowRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  arrowLeft: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  headphones: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14v-2a9 9 0 0118 0v2"/><path d="M21 19a2 2 0 01-2 2h-1v-7h1a2 2 0 012 2zM3 19a2 2 0 002 2h1v-7H5a2 2 0 00-2 2z"/></svg>,
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5A2.5 2.5 0 016.5 2H20v18H6.5a2.5 2.5 0 010-5H20"/></svg>,
  photo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><polyline points="21 15 16 10 5 21"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>,
  pen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4z"/></svg>,
  trophy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z"/><path d="M17 4h3v3a3 3 0 01-3 3M7 4H4v3a3 3 0 003 3"/></svg>,
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  helpCircle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>,
  exit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  bookmark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
  target: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
};

export function ETBrand({ subLabel, showName = true }) {
  return (
    <div className="et-topbar__brand">
      <img src={withBase('/logo.png')} alt="empeo" className="et-topbar__brand-mark" />
      {showName && (
        <div className="et-topbar__brand-name">
          <span className="et-pipe">|</span>
          English Proficiency Test
          {subLabel && (<><span className="et-pipe">|</span><span className="et-sub">{subLabel}</span></>)}
        </div>
      )}
    </div>
  );
}

// Format a duration in seconds as MM:SS (rounding up so the clock only hits
// 00:00 when time has truly run out).
export function formatClock(totalSec) {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function ETTimer({ time = '01:24:35', warn = false, big = false }) {
  return (
    <div className={`et-timer${warn ? ' et-timer--warn' : ''}${big ? ' et-timer--big' : ''}`}>
      <span className="et-timer__icon">{ETIcon.clock}</span>
      {time}
    </div>
  );
}

export function ETBtn({ kind = 'primary', size, icon, iconRight, children, onClick, style }) {
  const cls = ['et-btn', `et-btn--${kind}`];
  if (size) cls.push(`et-btn--${size}`);
  return (
    <button type="button" className={cls.join(' ')} onClick={onClick} style={style}>
      {icon && <span style={{ display: 'inline-flex', width: 16, height: 16 }}>{icon}</span>}
      {children}
      {iconRight && <span style={{ display: 'inline-flex', width: 16, height: 16 }}>{iconRight}</span>}
    </button>
  );
}

export function ETProgress({ value = 0, total = 100, variant = '' }) {
  const pct = Math.max(0, Math.min(100, (value / total) * 100));
  return (
    <div className={`et-progress ${variant ? `et-progress--${variant}` : ''}`}>
      <div className="et-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ETOption({ letter, text, selected, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`et-option${selected ? ' et-option--selected' : ''}`}
      onClick={onClick}
      style={onClick ? { width: '100%', textAlign: 'left', font: 'inherit' } : undefined}
    >
      <span className="et-option__bullet">{letter}</span>
      <div className="et-option__body"><div className="et-option__text">{text}</div></div>
    </Tag>
  );
}

export function ETQNav({ total, answered = [], flagged = [], current = 1, cols = 5 }) {
  const a = new Set(answered);
  const f = new Set(flagged);
  return (
    <div className="et-qnav" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const cls = ['et-qnav__btn'];
        if (a.has(n)) cls.push('et-qnav__btn--answered');
        if (n === current) cls.push('et-qnav__btn--current');
        if (f.has(n)) cls.push('et-qnav__btn--flagged');
        return <button key={n} type="button" className={cls.join(' ')}>{n}</button>;
      })}
    </div>
  );
}

export function ETAudio({ label = 'Audio · Part 3 · Conversation 2', current = '00:42', total = '01:18', progress = 0.55 }) {
  return (
    <div className="et-audio">
      <button className="et-audio__play" type="button">{ETIcon.play}</button>
      <div className="et-audio__main">
        <div className="et-audio__label">{label}</div>
        <div className="et-audio__bar">
          <div className="et-audio__bar-fill" style={{ width: `${progress * 100}%` }} />
          <div className="et-audio__bar-knob" style={{ left: `${progress * 100}%` }} />
        </div>
        <div className="et-audio__time"><span>{current}</span><span>{total}</span></div>
      </div>
      <div className="et-audio__ctrl">
        <button className="et-audio__icon-btn" type="button" style={{ width: 32, height: 32 }}>{ETIcon.rewind}</button>
        <button className="et-audio__icon-btn" type="button" style={{ width: 32, height: 32 }}>{ETIcon.volume}</button>
      </div>
    </div>
  );
}

export function ETTopbar({ subLabel = 'Internal Assessment', showName = false, crumbs, timer, exitLabel = 'Exit test', onExit, showExit = false, borderless = false }) {
  // Show only the strong (current) crumb — no parent prefix, no nesting.
  const current = crumbs && (crumbs.find((c) => c.strong) || crumbs[crumbs.length - 1]);
  return (
    <header className="et-topbar" style={borderless ? { borderBottom: 0 } : undefined}>
      <ETBrand subLabel={subLabel} showName={showName} />
      <div className="et-topbar__center">
        {current && (
          <div className="et-topbar__crumbs">
            <strong>{current.text}</strong>
          </div>
        )}
      </div>
      <div className="et-topbar__right">
        {timer}
        {showExit && (
          <button className="et-btn et-btn--ghost et-btn--sm" type="button" style={{ gap: 6 }} aria-label={exitLabel} onClick={onExit}>
            <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{ETIcon.exit}</span>
            <span className="et-mobile-hidden">{exitLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
}

export function ETFootbar({ left, center, right }) {
  return (
    <footer className="et-footbar">
      <div>{left}</div>
      <div className="et-footbar__center">{center}</div>
      <div style={{ display: 'flex', gap: 10 }}>{right}</div>
    </footer>
  );
}

// Frameless single-line audio status: an animated sound wave + caption.
// Shared by every listening screen's footer so they stay visually consistent.
// `active` animates the wave (audio is playing); otherwise the bars rest dim.
export function ETAudioStatus({ status, active = false }) {
  return (
    <div className="et-audio et-audio--exam">
      <div className={active ? 'et-audio__wave et-audio__wave--on' : 'et-audio__wave'} aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => <span key={i} />)}
      </div>
      <div className="et-audio__status">{status}</div>
    </div>
  );
}

export function ETPhoto({ children, style, label = 'Photograph', icon = true }) {
  return (
    <div className="et-photo" style={style}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 32px', maxWidth: '100%' }}>
        {icon && <span style={{ width: 28, height: 28, display: 'inline-flex', color: 'rgba(197,98,16,0.6)', flexShrink: 0 }}>{ETIcon.photo}</span>}
        <span style={{ textAlign: 'center', lineHeight: 1.45, whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 720 }}>{label}</span>
        {children}
      </div>
    </div>
  );
}
