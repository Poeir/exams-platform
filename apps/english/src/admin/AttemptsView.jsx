import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listAdminAttempts, getAdminAttempt } from '../data/examRepo.js';
import { getOptionLetters } from '../data/exam.js';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return '—';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '—';
  const seconds = Math.round((end - start) / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

function statusClass(status) {
  switch (status) {
    case 'submitted': return 'is-submitted';
    case 'in_progress': return 'is-progress';
    case 'expired': return 'is-expired';
    case 'pending': return 'is-pending';
    default: return '';
  }
}

export default function AttemptsView() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAdminAttempts();
      setAttempts(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    getAdminAttempt(selectedId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((e) => { if (!cancelled) setDetailError(e); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  return (
    <div className="et-admin-attempts">
      <aside className="et-admin-attempts__list et-scroll">
        <div className="et-admin-attempts__list-head">
          <div>
            <div className="et-admin__kicker">History</div>
            <strong>Attempts</strong>
          </div>
          <button type="button" className="et-btn et-btn--ghost et-btn--sm" onClick={refresh} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {error && <div className="et-admin__alert">{String(error.message || error)}</div>}
        {!loading && attempts.length === 0 && (
          <div className="et-admin__empty">No attempts yet.</div>
        )}
        <ul className="et-admin-attempts__rows">
          {attempts.map((a) => {
            const pct = a.max_total ? Math.round((a.correct_total / a.max_total) * 100) : null;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  className={`et-admin-attempts__row${selectedId === a.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedId(a.id)}
                >
                  <div className="et-admin-attempts__row-top">
                    <span className={`et-admin-attempts__status ${statusClass(a.status)}`}>{a.status}</span>
                    <span className="et-admin-attempts__when">{formatDate(a.submitted_at || a.started_at || a.created_at)}</span>
                  </div>
                  <div className="et-admin-attempts__row-mid">
                    <strong>{a.display_name || a.external_user_id || 'Anonymous'}</strong>
                    <span>{a.paper_name || a.paper_id}</span>
                  </div>
                  <div className="et-admin-attempts__row-bot">
                    {a.status === 'submitted' ? (
                      <>
                        <span>{a.correct_total}/{a.max_total}{pct != null ? ` · ${pct}%` : ''}</span>
                        <span>{a.cefr_label ? `CEFR ${a.cefr_label}` : ''}</span>
                      </>
                    ) : (
                      <span className="et-admin__muted">No score yet</span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <main className="et-admin-attempts__detail et-scroll">
        {detailError && <div className="et-admin__alert">{String(detailError.message || detailError)}</div>}
        {!selectedId && !detailLoading && (
          <div className="et-admin-attempts__placeholder">Select an attempt to inspect its answers.</div>
        )}
        {detailLoading && <div className="et-admin__muted">Loading attempt…</div>}
        {detail && <AttemptDetail data={detail} />}
      </main>
    </div>
  );
}

function AttemptDetail({ data }) {
  const { attempt, paper, sections } = data;
  const answers = attempt.answers || {};

  // Flatten items and compute correctness in the same order they're stored.
  const partGroups = useMemo(() => {
    const partMap = new Map();
    for (const s of sections) {
      const m = (s.name || '').match(/Part (\d+)/);
      const part = m ? Number(m[1]) : 0;
      if (!partMap.has(part)) partMap.set(part, []);
      partMap.get(part).push(s);
    }
    return [...partMap.entries()].sort((a, b) => a[0] - b[0]);
  }, [sections]);

  let counterCorrect = 0;
  let counterAnswered = 0;
  let counterTotal = 0;
  for (const s of sections) {
    for (const it of s.items) {
      counterTotal += 1;
      const ans = answers[it.id];
      if (ans != null) counterAnswered += 1;
      if (ans != null && ans === it.correct_answer) counterCorrect += 1;
    }
  }
  const unanswered = counterTotal - counterAnswered;

  return (
    <div className="et-admin-attempt">
      <header className="et-admin-attempt__header">
        <div>
          <div className="et-admin__kicker">Attempt</div>
          <h2>{attempt.external_user_id || 'Anonymous candidate'}</h2>
          <p className="et-admin-attempt__meta">
            {paper?.name || attempt.paper_id} · <span className="et-mono">{attempt.id}</span>
          </p>
        </div>
        <div className={`et-admin-attempts__status ${statusClass(attempt.status)} et-admin-attempts__status--lg`}>
          {attempt.status}
        </div>
      </header>

      <div className="et-admin-attempt__stats">
        <div>
          <span>Score</span>
          <strong>{attempt.correct_total ?? counterCorrect}/{attempt.max_total ?? counterTotal}</strong>
        </div>
        <div>
          <span>CEFR</span>
          <strong>{attempt.cefr_label || '—'}</strong>
        </div>
        <div>
          <span>Answered</span>
          <strong>{counterAnswered}/{counterTotal}</strong>
        </div>
        <div>
          <span>Unanswered</span>
          <strong>{unanswered}</strong>
        </div>
        <div>
          <span>Time limit</span>
          <strong>{attempt.time_limit_min ? `${attempt.time_limit_min} min` : '—'}</strong>
        </div>
        <div>
          <span>Duration</span>
          <strong>{formatDuration(attempt.started_at, attempt.submitted_at)}</strong>
        </div>
        <div>
          <span>Started</span>
          <strong>{formatDate(attempt.started_at)}</strong>
        </div>
        <div>
          <span>Submitted</span>
          <strong>{formatDate(attempt.submitted_at)}</strong>
        </div>
      </div>

      {attempt.result?.parts?.length > 0 && (
        <div className="et-admin-attempt__parts">
          <h3>By part</h3>
          <table className="et-admin-attempt__table">
            <thead>
              <tr><th>Part</th><th>Section</th><th>Correct</th><th>Total</th><th>%</th></tr>
            </thead>
            <tbody>
              {attempt.result.parts.map((p) => (
                <tr key={p.id}>
                  <td>Part {p.id} — {p.title}</td>
                  <td>{p.section}</td>
                  <td>{p.correct}</td>
                  <td>{p.total}</td>
                  <td>{p.total ? Math.round((p.correct / p.total) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="et-admin-attempt__items">
        <h3>Answers</h3>
        {partGroups.map(([part, partSections]) => {
          let qIndex = 0;
          return (
            <section key={part} className="et-admin-attempt__part">
              <h4>Part {part}</h4>
              {partSections.map((s) => (
                <div key={s.id} className="et-admin-attempt__section">
                  {s.passage_content && (
                    <details className="et-admin-attempt__passage">
                      <summary>Passage — {s.name}</summary>
                      <div className="et-admin-attempt__passage-body">{s.passage_content}</div>
                    </details>
                  )}
                  {s.items.map((it) => {
                    qIndex += 1;
                    const userAnswer = answers[it.id];
                    const correct = it.correct_answer;
                    const isCorrect = userAnswer != null && userAnswer === correct;
                    const isUnanswered = userAnswer == null || userAnswer === '';
                    const status = isUnanswered ? 'unanswered' : (isCorrect ? 'correct' : 'wrong');
                    const letters = getOptionLetters(it);
                    return (
                      <article key={it.id} className={`et-admin-attempt__item is-${status}`}>
                        <header>
                          <span className="et-admin-attempt__qnum">Q{qIndex}</span>
                          <span className={`et-admin-attempt__badge is-${status}`}>
                            {status === 'correct' && 'Correct'}
                            {status === 'wrong' && 'Wrong'}
                            {status === 'unanswered' && 'Unanswered'}
                          </span>
                          <span className="et-admin-attempt__answers">
                            User: <strong>{userAnswer || '—'}</strong> · Key: <strong>{correct || '—'}</strong>
                          </span>
                        </header>
                        {it.stem && <p className="et-admin-attempt__stem">{it.stem}</p>}
                        <ul className="et-admin-attempt__options">
                          {letters.map((L) => {
                            const text = it.options?.[L];
                            const isKey = correct === L;
                            const isPicked = userAnswer === L;
                            return (
                              <li
                                key={L}
                                className={`et-admin-attempt__opt${isKey ? ' is-key' : ''}${isPicked ? ' is-picked' : ''}`}
                              >
                                <span className="et-admin-attempt__opt-letter">{L}</span>
                                <span>{text || <em className="et-admin__muted">(empty)</em>}</span>
                                {isKey && <span className="et-admin-attempt__opt-tag">Key</span>}
                                {isPicked && !isKey && <span className="et-admin-attempt__opt-tag is-wrong">Picked</span>}
                              </li>
                            );
                          })}
                        </ul>
                        {it.explanation && (
                          <details className="et-admin-attempt__explain">
                            <summary>Explanation</summary>
                            <div>{it.explanation}</div>
                          </details>
                        )}
                      </article>
                    );
                  })}
                </div>
              ))}
            </section>
          );
        })}
      </div>

      <details className="et-admin-attempt__raw">
        <summary>Raw attempt JSON</summary>
        <pre>{JSON.stringify(attempt, null, 2)}</pre>
      </details>
    </div>
  );
}
