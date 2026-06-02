import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedBundle } from '../seedCore.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_JSON = join(__dirname, '..', '..', '..', 'papers_export_1_full.json');

const router = Router();

router.post('/seed', requireAdmin, async (req, res, next) => {
  try {
    const bundle = req.body && req.body.papers
      ? req.body
      : JSON.parse(readFileSync(DEFAULT_JSON, 'utf8'));

    const summary = await seedBundle(bundle);
    res.json({ ok: true, ...summary });
  } catch (err) { next(err); }
});

export default router;
