import React from 'react';
import { ETBrand } from './Common.jsx';

export default function Topbar({ subLabel = 'Internal Assessment', crumbs, right, borderless = false }) {
  return (
    <header className="et-topbar" style={borderless ? { borderBottom: 0 } : undefined}>
      <ETBrand subLabel={subLabel} />
      <div className="et-topbar__center">
        {crumbs && (
          <div className="et-topbar__crumbs">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ color: 'var(--gf-pewter-7)' }}>/</span>}
                {c.strong ? <strong>{c.text}</strong> : <span>{c.text}</span>}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      <div className="et-topbar__right">{right}</div>
    </header>
  );
}
