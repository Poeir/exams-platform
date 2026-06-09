// Azure Blob Storage access via a container-scoped SAS token held server-side.
// The storage account has anonymous/public read DISABLED, so blobs are never
// exposed to browsers directly — both uploads and reads proxy through this
// server (see routes/media.js). The SAS lives only in env (AZURE_STORAGE_SAS)
// and can be rotated without touching code or stored content (we persist opaque
// blob names, never SAS-bearing URLs).
import { randomUUID } from 'node:crypto';

const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT || null;
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || null;
// The SAS query string, stored without a leading '?'. Tolerate either form.
const SAS = (process.env.AZURE_STORAGE_SAS || '').replace(/^\?/, '');

export function isConfigured() {
  return Boolean(ACCOUNT && CONTAINER && SAS);
}

function blobUrl(name) {
  const base = `https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}/${encodeURIComponent(name)}`;
  return `${base}?${SAS}`;
}

// Make an opaque, collision-free blob name that preserves the file extension.
export function makeBlobName(filename) {
  const raw = String(filename || '');
  const dot = raw.lastIndexOf('.');
  const ext = dot >= 0 ? raw.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
  return `${randomUUID()}${ext}`;
}

// Upload bytes to the container. Throws on a non-2xx Azure response.
export async function uploadBlob(name, contentType, body) {
  const res = await fetch(blobUrl(name), {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': contentType || 'application/octet-stream',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Azure upload ${res.status}: ${text.slice(0, 300)}`);
  }
  return name;
}

// Fetch a blob for proxying back to the browser. `range` forwards an HTTP Range
// header so <audio> seeking works. Returns the raw fetch Response.
export function fetchBlob(name, range) {
  const headers = {};
  if (range) headers.Range = range;
  return fetch(blobUrl(name), { headers });
}
