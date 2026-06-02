import React, { useState } from 'react';
import { getRuntimeConfig } from '../data/config.js';

export default function MediaUploader({ accept, label, currentUrl, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [saved, setSaved] = useState(false);
  const isImage = accept?.startsWith('image');
  const isAudio = accept?.startsWith('audio');

  const handleFile = async (file) => {
    if (!file) return;
    const { cloudName, uploadPreset } = await getRuntimeConfig();
    if (!cloudName || !uploadPreset) {
      setErr('Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET on the server.');
      return;
    }
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Cloudinary ${res.status}: ${text}`);
      }
      const data = await res.json();
      await onUploaded?.(data.secure_url, data);
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
          {isImage && <img className="et-admin-media__image" src={currentUrl} alt="Uploaded preview" />}
          {isAudio && <audio className="et-admin-media__audio" src={currentUrl} controls preload="metadata" />}
          <a className="et-admin-media__url" href={currentUrl} target="_blank" rel="noreferrer">{currentUrl}</a>
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
