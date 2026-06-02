import React, { useEffect, useState } from 'react';
import { updateSection, deleteSection, createItem } from '../data/examRepo.js';

export default function SectionEditor({ section, onSaved, onDeleted, onItemCreated, onClose }) {
  const [draft, setDraft] = useState(section);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { setDraft(section); setErr(null); }, [section?.id]);

  if (!draft) return null;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const updated = await updateSection(draft.id, {
        name: draft.name,
        skill: draft.skill,
        cefr: draft.cefr,
        topic: draft.topic,
        section_score: draft.section_score,
        section_time_min: draft.section_time_min,
        passage_content: draft.passage_content,
      });
      onSaved?.(updated);
    } catch (e) {
      setErr(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this section and all its items?')) return;
    setSaving(true);
    try {
      await deleteSection(draft.id);
      onDeleted?.(draft.id);
    } catch (e) {
      setErr(e.message || 'Delete failed');
      setSaving(false);
    }
  };

  const addItem = async () => {
    try {
      const created = await createItem(draft.id, {
        stem: 'New question',
        options: { A: '', B: '', C: '', D: '' },
        correct_answer: 'A',
        order_index: (draft.items?.length || 0),
      });
      onItemCreated?.(created);
    } catch (e) {
      setErr(e.message || 'Add failed');
    }
  };

  return (
    <div className="et-admin-editor">
      <header className="et-admin-editor__header">
        <div>
          <div className="et-admin__kicker">Section editor</div>
          <h2>{draft.name || 'Untitled section'}</h2>
          <p>{draft.items?.length || 0} questions in this section</p>
        </div>
        <div className="et-admin-editor__actions">
          <button type="button" className="et-btn et-btn--ghost et-btn--sm" onClick={onClose}>Close</button>
          <button type="button" className="et-btn et-btn--danger-ghost et-btn--sm" onClick={remove} disabled={saving}>Delete</button>
          <button type="button" className="et-btn et-btn--primary et-btn--sm" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save section'}
          </button>
        </div>
      </header>

      <section className="et-admin-card">
        <div className="et-admin-card__title">
          <h3>Section details</h3>
          <span>Information learners see during the exam</span>
        </div>
        <Field label="Section name">
          <input className="et-admin-input" value={draft.name || ''} onChange={(e) => set({ name: e.target.value })} />
        </Field>

        <div className="et-admin-fields et-admin-fields--three">
          <Field label="Skill">
            <input className="et-admin-input" value={draft.skill || ''} onChange={(e) => set({ skill: e.target.value })} />
          </Field>
          <Field label="CEFR">
            <input className="et-admin-input" value={draft.cefr || ''} onChange={(e) => set({ cefr: e.target.value })} />
          </Field>
          <Field label="Time (minutes)">
            <input
              className="et-admin-input"
              type="number"
              value={draft.section_time_min ?? 0}
              onChange={(e) => set({ section_time_min: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>

        <Field label="Topic">
          <textarea className="et-admin-input" value={draft.topic || ''} onChange={(e) => set({ topic: e.target.value })} rows={3} />
        </Field>
      </section>

      <section className="et-admin-card">
        <div className="et-admin-card__title">
          <h3>Passage content</h3>
          <span>Leave empty when the section does not use a shared passage</span>
        </div>
        <textarea
          className="et-admin-input et-admin-input--passage"
          value={draft.passage_content || ''}
          onChange={(e) => set({ passage_content: e.target.value })}
          rows={10}
        />
      </section>

      <div className="et-admin-editor__footer">
        <span>{draft.items?.length || 0} questions already in this section</span>
        <button type="button" className="et-btn et-btn--secondary et-btn--sm" onClick={addItem}>+ Add question</button>
      </div>

      {err && <div className="et-admin-inline-error">{err}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="et-admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
