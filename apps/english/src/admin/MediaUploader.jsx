import React, { useState } from 'react';
import { withBase, resolveMediaUrl } from '../lib/base.js';

export default function MediaUploader({ accept, label, currentUrl, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [saved, setSaved] = useState(false);
  const isImage = accept?.startsWith('image');
  const isAudio = accept?.startsWith('audio');
  const previewUrl = resolveMediaUrl(currentUrl);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      // Stream the raw bytes to our own API, which PUTs them to Azure with the
      // server-held SAS (the browser never sees the credential). Basic-auth
      // creds are attached automatically — the admin is already signed in.
      const res = await fetch(
        `${withBase('/api/media')}?filename=${encodeURIComponent(file.name)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Upload ${res.status}: ${text}`);
      }
      const { name } = await res.json();
      await onUploaded?.(name);
      setSaved(true);
    } catch (e) {
      setErr(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="et-admin-media">
      <div className="et-admin-media__head">
        <strong>{label}</strong>
        {saved && <span>Saved</span>}
      </div>
      {currentUrl && (
        <>
          {isImage && <img className="et-admin-media__image" src={previewUrl} alt="Uploaded preview" />}
          {isAudio && <audio className="et-admin-media__audio" src={previewUrl} controls preload="metadata" />}
          <a className="et-admin-media__url" href={previewUrl} target="_blank" rel="noreferrer">{currentUrl}</a>
        </>
      )}
      <label className={`et-admin-media__pick${busy ? ' is-disabled' : ''}`}>
        <input
          type="file"
          accept={accept}
          disabled={busy}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {busy ? 'Uploading...' : `Choose ${label.toLowerCase()}`}
      </label>
      {err && <div className="et-admin-inline-error">{err}</div>}
    </div>
  );
}
