import React, { useEffect, useState } from 'react';
import { ResultCertificate } from './Results.jsx';
import { paperVariant } from '../data/exam.js';
import { withBase } from '../lib/base.js';

// Read-only result page for the parent site ("open result in a new tab").
// Reached at /result?view_token=<signed view token> (legacy ?vt= still
// works); the token is minted for the parent backend by
// POST /api/attempts/:id/view-link and expires quickly.
//
// Renders the SAME certificate layout as the candidate's Results screen
// (ResultCertificate, shared from Results.jsx) — but fed from the server's
// display summary instead of local exam state, so it carries no answer key
// and works in a fresh browser with no ExamContext.

export default function ResultViewer() {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vt = params.get('view_token') || params.get('vt');
    if (!vt) {
      setState({ loading: false, error: 'missing view token', data: null });
      return;
    }
    (async () => {
      try {
        const res = await fetch(withBase(`/api/attempts/view?view_token=${encodeURIComponent(vt)}`));
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || `request failed (${res.status})`);
        setState({ loading: false, error: null, data: payload });
      } catch (e) {
        setState({ loading: false, error: e.message, data: null });
      }
    })();
  }, []);

  return (
    <div className="et et-screen et-screen--white">
      <div className="et-results et-results--dim">
        <div className="et-results__inner">
          {state.loading && (
            <p style={{ color: 'var(--fg-3)', fontWeight: 600, textAlign: 'center' }}>
              Loading result…
            </p>
          )}

          {state.error && (
            <div style={{ textAlign: 'center' }}>
              <h2 className="gf-h4" style={{ marginBottom: 8 }}>Couldn’t open this result</h2>
              <p style={{ color: 'var(--fg-2)', fontWeight: 500, margin: 0 }}>
                {/expired|invalid|token/i.test(state.error)
                  ? 'This view link is invalid or has expired — please open it again from the source system.'
                  : state.error}
              </p>
            </div>
          )}

          {state.data && state.data.result?.skills && (
            <ResultCertificate
              user={{
                name: state.data.displayName || state.data.externalUserId || 'Anonymous candidate',
                // The candidate's job position (carried in the signed view token),
                // NOT the paper name — that belongs to the result, not the person.
                position: state.data.role || 'Candidate',
                avatarUrl: state.data.avatarUrl || null,
              }}
              skills={state.data.result?.skills}
              issuedAt={state.data.completedAt}
              variant={paperVariant(state.data.paperName)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
