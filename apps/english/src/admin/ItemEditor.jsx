import React, { useEffect, useState } from 'react';
import MediaUploader from './MediaUploader.jsx';
import { updateItem, deleteItem } from '../data/examRepo.js';

const DEFAULT_LETTERS = ['A', 'B', 'C', 'D'];

function getLetters(options) {
  return Object.keys(options || {}).filter((k) => k !== '_extras');
}

export default function ItemEditor({ item, onSaved, onDeleted, onClose }) {
  const [draft, setDraft] = useState(item);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { setDraft(item); setErr(null); }, [item?.id]);

  if (!draft) return null;

  const letters = getLetters(draft.options);
  const ensureLetters = letters.length > 0 ? letters : DEFAULT_LETTERS;
  const extras = draft.options?._extras || {};

  const setOption = (letter, value) => {
    setDraft((d) => ({
      ...d,
      options: { ...d.options, [letter]: value },
    }));
  };

  const setExtras = (patch) => {
    setDraft((d) => ({
      ...d,
      options: { ...d.options, _extras: { ...(d.options?._extras || {}), ...patch } },
    }));
  };

  const saveUploadedMedia = async (key, url) => {
    const nextExtras = { ...extras, [key]: url };
    const updated = await updateItem(draft.id, { extras: nextExtras });
    setDraft((d) => ({
      ...d,
      options: { ...d.options, _extras: updated.options?._extras || nextExtras },
    }));
    onSaved?.(updated);
  };

  const addOption = () => {
    const used = new Set(getLetters(draft.options));
    const next = ['A', 'B', 'C', 'D', 'E', 'F'].find((L) => !used.has(L));
    if (!next) return;
    setOption(next, '');
  };

  const removeOption = (letter) => {
    setDraft((d) => {
      const { [letter]: _, ...rest } = d.options;
      const correct = d.correct_answer === letter ? Object.keys(rest).find((k) => k !== '_extras') || 'A' : d.correct_answer;
      return { ...d, options: rest, correct_answer: correct };
    });
  };

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const updated = await updateItem(draft.id, {
        stem: draft.stem,
        options: draft.options,
        correct_answer: draft.correct_answer,
        explanation: draft.explanation,
        question_type: draft.question_type,
        cefr_level: draft.cefr_level,
        difficulty_band: draft.difficulty_band,
        tags: draft.tags,
        objective: draft.objective,
      });
      onSaved?.(updated);
    } catch (e) {
      setErr(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this item?')) return;
    setSaving(true);
    try {
      await deleteItem(draft.id);
      onDeleted?.(draft.id);
    } catch (e) {
      setErr(e.message || 'Delete failed');
      setSaving(false);
    }
  };

  return (
    <div className="et-admin-editor">
      <header className="et-admin-editor__header">
        <div>
          <div className="et-admin__kicker">Question editor</div>
          <h2>{draft.stem || 'New question'}</h2>
          <p>ID {draft.id.slice(0, 8)} / Correct answer: {draft.correct_answer || '-'}</p>
        </div>
        <div className="et-admin-editor__actions">
          <button type="button" className="et-btn et-btn--ghost et-btn--sm" onClick={onClose}>Close</button>
          <button type="button" className="et-btn et-btn--danger-ghost et-btn--sm" onClick={remove} disabled={saving}>Delete</button>
          <button type="button" className="et-btn et-btn--primary et-btn--sm" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save question'}
          </button>
        </div>
      </header>

      <div className="et-admin-editor__columns">
        <div className="et-admin-stack">
          <section className="et-admin-card">
            <div className="et-admin-card__title">
              <h3>Prompt and answers</h3>
              <span>Select the radio button for the correct answer</span>
            </div>
            <Field label="Question prompt">
              <textarea
                className="et-admin-input"
                value={draft.stem || ''}
                onChange={(e) => setDraft({ ...draft, stem: e.target.value })}
                rows={4}
              />
            </Field>
            <div className="et-admin-options__head">
              <span>Answer choices</span>
              <button type="button" className="et-btn et-btn--ghost et-btn--sm" onClick={addOption}>+ Add choice</button>
            </div>
            <div className="et-admin-options">
              {ensureLetters.map((L) => (
                <div key={L} className={`et-admin-option${draft.correct_answer === L ? ' is-correct' : ''}`}>
                  <label className="et-admin-option__choice" title="Set as correct answer">
                    <input
                      type="radio"
                      name={`correct-${draft.id}`}
                      checked={draft.correct_answer === L}
                      onChange={() => setDraft({ ...draft, correct_answer: L })}
                    />
                    <strong>{L}</strong>
                  </label>
                  <textarea
                    className="et-admin-input"
                    value={draft.options?.[L] || ''}
                    onChange={(e) => setOption(L, e.target.value)}
                    rows={2}
                  />
                  {ensureLetters.length > 2 && (
                    <button type="button" className="et-admin-option__remove" onClick={() => removeOption(L)} aria-label={`Remove option ${L}`}>x</button>
                  )}
                </div>
              ))}
            </div>
            <Field label="Explanation">
              <textarea
                className="et-admin-input"
                value={draft.explanation || ''}
                onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                rows={4}
              />
            </Field>
          </section>
        </div>

        <aside className="et-admin-stack">
          <section className="et-admin-card">
            <div className="et-admin-card__title">
              <h3>Classification</h3>
            </div>
            <div className="et-admin-fields">
              <Field label="Question type">
                <input className="et-admin-input" value={draft.question_type || ''} onChange={(e) => setDraft({ ...draft, question_type: e.target.value })} />
              </Field>
              <Field label="CEFR">
                <input className="et-admin-input" value={draft.cefr_level || ''} onChange={(e) => setDraft({ ...draft, cefr_level: e.target.value })} />
              </Field>
              <Field label="Difficulty">
                <input className="et-admin-input" value={draft.difficulty_band || ''} onChange={(e) => setDraft({ ...draft, difficulty_band: e.target.value })} />
              </Field>
            </div>
          </section>

          <section className="et-admin-card et-admin-card--media">
            <div className="et-admin-card__title">
              <h3>Media</h3>
              <span>Uploads save immediately</span>
            </div>
            <MediaUploader
              label="Image"
              accept="image/*"
              currentUrl={extras.image_url}
              onUploaded={(url) => saveUploadedMedia('image_url', url)}
            />
            <MediaUploader
              label="Audio"
              accept="audio/*"
              currentUrl={extras.audio_url}
              onUploaded={(url) => saveUploadedMedia('audio_url', url)}
            />
            <Field label="Audio script">
              <textarea
                className="et-admin-input"
                value={extras.audio_script || ''}
                onChange={(e) => setExtras({ audio_script: e.target.value })}
                rows={4}
              />
            </Field>
            <Field label="Image prompt">
              <textarea
                className="et-admin-input"
                value={extras.image_prompt || ''}
                onChange={(e) => setExtras({ image_prompt: e.target.value })}
                rows={3}
              />
            </Field>
          </section>
        </aside>
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
