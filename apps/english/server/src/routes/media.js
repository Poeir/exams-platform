import { Router } from 'express';
import express from 'express';
import { Readable } from 'node:stream';
import { requireAdmin } from '../middleware/adminAuth.js';
import { isConfigured, makeBlobName, uploadBlob, fetchBlob } from '../azureStorage.js';

const router = Router();

// 25 MB covers exam photographs and the longest listening clips comfortably.
const MAX_UPLOAD = 25 * 1024 * 1024;

// Admin uploads a media file (image/audio). The raw bytes are PUT straight to
// Azure with the server-held SAS; the browser never sees the credential and no
// Azure CORS rule is needed. We return the opaque blob name — that is what the
// admin UI stores in the item's _extras, and what GET /api/media/:name serves.
router.put(
  '/media',
  requireAdmin,
  express.raw({ type: '*/*', limit: MAX_UPLOAD }),
  async (req, res, next) => {
    try {
      if (!isConfigured()) {
        return res.status(503).json({ error: 'Azure storage not configured (set AZURE_STORAGE_* env)' });
      }
      const contentType = req.get('content-type') || 'application/octet-stream';
      if (!/^(image|audio)\//i.test(contentType)) {
        return res.status(415).json({ error: 'Only image/* and audio/* uploads are allowed' });
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'Empty upload body' });
      }
      const name = makeBlobName(req.query.filename);
      await uploadBlob(name, contentType, req.body);
      res.status(201).json({ name });
    } catch (err) { next(err); }
  },
);

// Public read proxy: candidates load exam images/audio through here, so the
// locked-down storage account stays private. Forwards Range (audio seeking),
// passes the upstream content headers, and caches hard — blob names are opaque
// and never reused, so a stored asset is effectively immutable.
router.get('/media/:name', async (req, res, next) => {
  try {
    if (!isConfigured()) return res.status(503).end();
    const upstream = await fetchBlob(req.params.name, req.get('range'));
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status === 404 ? 404 : 502).end();
    }
    res.status(upstream.status);
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
      const v = upstream.headers.get(h);
      if (v) res.set(h, v);
    }
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) { next(err); }
});

export default router;
