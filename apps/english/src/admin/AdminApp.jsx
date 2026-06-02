import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listPapers, getPaperFull, createPaper, deletePaper, updatePaper,
  createSection, seedFromServer, clearAdminAuth,
} from '../data/examRepo.js';
import SectionEditor from './SectionEditor.jsx';
import ItemEditor from './ItemEditor.jsx';
import AttemptsView from './AttemptsView.jsx';
import { withBase } from '../lib/base.js';

export default function AdminApp() {
  const [papers, setPapers] = useState([]);
  const [paperId, setPaperId] = useState(null);
  const [bundle, setBundle] = useState(null); // { paper, sections: [{...section, items: []}] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selection, setSelection] = useState(null); // { type: 'section'|'item', id }
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('content'); // 'content' | 'attempts'

  const refreshPapers = useCallback(async () => {
    setError(null);
    try {
      const list = await listPapers();
      setPapers(list);
      return list;
    } catch (e) {
      setError(e);
      return [];
    }
  }, []);

  const loadPaper = useCallback(async (id) => {
    if (!id) { setBundle(null); return; }
    setLoading(true);
    setError(null);
    try {
      const b = await getPaperFull(id);
      setBundle(b);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const list = await refreshPapers();
      if (list.length > 0) {
        setPaperId(list[0].id);
      } else {
        setLoading(false);
      }
    })();
  }, [refreshPapers]);

  useEffect(() => {
    if (paperId) loadPaper(paperId);
  }, [paperId, loadPaper]);

  const sectionsByPart = useMemo(() => {
    const map = new Map();
    for (const s of bundle?.sections || []) {
      const m = (s.name || '').match(/Part (\d+)/);
      const part = m ? Number(m[1]) : 0;
      if (!map.has(part)) map.set(part, []);
      map.get(part).push(s);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [bundle]);

  const selectedSection = useMemo(() => {
    if (!selection || selection.type !== 'section') return null;
    return bundle?.sections.find((s) => s.id === selection.id) || null;
  }, [selection, bundle]);

  const selectedItem = useMemo(() => {
    if (!selection || selection.type !== 'item') return null;
    for (const s of bundle?.sections || []) {
      const it = s.items.find((i) => i.id === selection.id);
      if (it) return it;
    }
    return null;
  }, [selection, bundle]);

  const itemCount = bundle?.sections.reduce((total, section) => total + section.items.length, 0) || 0;

  const seed = async () => {
    if (!confirm('Seed/overwrite content from papers_export_1_full.json on the server?')) return;
    setBusy(true);
    try {
      const result = await seedFromServer();
      alert(`Seeded: ${result.papers} paper(s), ${result.sections} section(s), ${result.items} item(s).`);
      const list = await refreshPapers();
      if (list.length > 0) {
        setPaperId(list[0].id);
        await loadPaper(list[0].id);
      }
    } catch (e) {
      alert(`Seed failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handlePaperRename = async () => {
    const name = prompt('Paper name', bundle?.paper?.name || '');
    if (name == null) return;
    try {
      await updatePaper(paperId, { name });
      await loadPaper(paperId);
      await refreshPapers();
    } catch (e) { alert(e.message); }
  };

  const handlePaperDelete = async () => {
    if (!confirm('Delete this paper and all its content?')) return;
    try {
      await deletePaper(paperId);
      setPaperId(null);
      setBundle(null);
      setSelection(null);
      const list = await refreshPapers();
      if (list[0]) setPaperId(list[0].id);
    } catch (e) { alert(e.message); }
  };

  const handleNewPaper = async () => {
    const name = prompt('New paper name', 'Untitled paper');
    if (!name) return;
    try {
      const created = await createPaper({ name });
      await refreshPapers();
      setPaperId(created.id);
    } catch (e) { alert(e.message); }
  };

  const handleAddSection = async (partNumber) => {
    const name = prompt(`Section name (e.g. "Section X - Listening: Part ${partNumber} ...")`,
      `Section new - Part ${partNumber}`);
    if (!name) return;
    try {
      await createSection(paperId, { name, part_number: partNumber, items: [] });
      await loadPaper(paperId);
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="et et-admin">
      <header className="et-admin__header">
        <div className="et-admin__brand">
          <div className="et-admin__identity">
            <span className="et-topbar__brand-mark">G</span>
            <span className="et-topbar__brand-name">
              Gofive <span className="et-pipe">|</span><span className="et-sub">Exam Admin</span>
            </span>
          </div>
          {view === 'content' && (
            <>
              <select
                className="et-admin__paper-select"
                value={paperId || ''}
                onChange={(e) => { setPaperId(e.target.value); setSelection(null); }}
                aria-label="Select paper"
              >
                {papers.length === 0 && <option value="">(no papers)</option>}
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {bundle && (
                <div className="et-admin__paper-actions">
                  <button type="button" className="et-btn et-btn--ghost et-btn--sm" onClick={handlePaperRename}>Rename</button>
                  <button type="button" className="et-btn et-btn--danger-ghost et-btn--sm" onClick={handlePaperDelete}>Delete</button>
                </div>
              )}
            </>
          )}
          <div className="et-admin__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'content'}
              className={`et-admin__tab${view === 'content' ? ' is-active' : ''}`}
              onClick={() => setView('content')}
            >Content</button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'attempts'}
              className={`et-admin__tab${view === 'attempts' ? ' is-active' : ''}`}
              onClick={() => setView('attempts')}
            >Attempts</button>
          </div>
        </div>
        <div className="et-admin__actions">
          <a
            href={withBase('/')}
            className="et-btn et-btn--ghost et-btn--sm"
            onClick={async (e) => {
              e.preventDefault();
              await clearAdminAuth();
              window.location.href = withBase('/');
            }}
          >Exit to exam</a>
          {view === 'content' && (
            <>
              <button type="button" className="et-btn et-btn--secondary et-btn--sm" onClick={handleNewPaper}>+ New paper</button>
              <button type="button" className="et-btn et-btn--secondary et-btn--sm" onClick={() => loadPaper(paperId)} disabled={!paperId}>Reload</button>
              <button type="button" className="et-btn et-btn--primary et-btn--sm" onClick={seed} disabled={busy}>
                {busy ? 'Seeding...' : 'Seed from JSON'}
              </button>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="et-admin__alert">
          {String(error.message || error)}
        </div>
      )}

      {view === 'attempts' && <AttemptsView />}

      {view === 'content' && (
      <div className="et-admin__body">
        <aside className="et-admin__sidebar et-scroll">
          <div className="et-admin__sidebar-header">
            <div className="et-admin__kicker">Structure</div>
            <strong>Questions</strong>
            {bundle && <span>{itemCount} items</span>}
          </div>
          {loading && <div className="et-admin__muted">Loading...</div>}
          {!loading && !bundle && papers.length === 0 && (
            <div className="et-admin__empty">
              No papers yet. Click <strong>Seed from JSON</strong> to import the default exam.
            </div>
          )}
          {bundle && (
            <nav className="et-admin-tree" aria-label="Paper content">
              {sectionsByPart.map(([part, sections]) => (
                <div key={part} className="et-admin-tree__part">
                  <div className="et-admin-tree__part-head">
                    <strong>Part {part}</strong>
                    <button type="button" onClick={() => handleAddSection(part)}>+ Section</button>
                  </div>
                  {sections.map((s) => (
                    <div key={s.id} className="et-admin-tree__section">
                      <button
                        type="button"
                        onClick={() => setSelection({ type: 'section', id: s.id })}
                        className={`et-admin-tree__section-btn${selection?.type === 'section' && selection.id === s.id ? ' is-active' : ''}`}
                        title={s.name}
                      >
                        <span>{s.name}</span>
                        <b>{s.items.length}</b>
                      </button>
                      <div className="et-admin-tree__items">
                        {s.items.map((it, i) => (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => setSelection({ type: 'item', id: it.id })}
                            className={`et-admin-tree__item${selection?.type === 'item' && selection.id === it.id ? ' is-active' : ''}`}
                            title={it.stem}
                          >
                            <span className="et-admin-tree__number">{i + 1}</span>
                            <span>{truncate(it.stem, 36)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </nav>
          )}
        </aside>

        <main className="et-admin__workspace et-scroll">
          {!selection && bundle && (
            <div className="et-admin-welcome">
              <div className="et-admin__kicker">Selected paper</div>
              <h2>{bundle.paper.name}</h2>
              <p>Select a section to edit instructions, or select a question to manage choices and media.</p>
              <div className="et-admin-welcome__stats">
                <div><strong>{bundle.sections.length}</strong><span>Sections</span></div>
                <div><strong>{itemCount}</strong><span>Questions</span></div>
                <div><strong>{sectionsByPart.length}</strong><span>Parts</span></div>
              </div>
            </div>
          )}
          {selectedSection && (
            <SectionEditor
              key={selectedSection.id}
              section={selectedSection}
              onSaved={() => loadPaper(paperId)}
              onDeleted={() => { setSelection(null); loadPaper(paperId); }}
              onItemCreated={(it) => { loadPaper(paperId); setSelection({ type: 'item', id: it.id }); }}
              onClose={() => setSelection(null)}
            />
          )}
          {selectedItem && (
            <ItemEditor
              key={selectedItem.id}
              item={selectedItem}
              onSaved={() => loadPaper(paperId)}
              onDeleted={() => { setSelection(null); loadPaper(paperId); }}
              onClose={() => setSelection(null)}
            />
          )}
        </main>
      </div>
      )}
    </div>
  );
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 3) + '...' : s;
}
