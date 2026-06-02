import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db.js';
import { rowToItem, splitOptions } from '../shape.js';
import { toDbJson } from '../json.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

router.post('/sections/:sectionId/items', requireAdmin, async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { options, extras } = splitOptions(req.body.options || { A: '', B: '', C: '', D: '' });
    const item = await prisma.item.create({
      data: {
        id: req.body.id || randomUUID(),
        section_id: sectionId,
        stem: req.body.stem || '',
        question_type: req.body.question_type ?? null,
        cefr_level: req.body.cefr_level ?? null,
        difficulty_band: req.body.difficulty_band ?? null,
        score_weight: req.body.score_weight ?? 1,
        correct_answer: req.body.correct_answer || 'A',
        explanation: req.body.explanation ?? null,
        judge_score: req.body.judge_score ?? null,
        objective: req.body.objective ?? null,
        tags: toDbJson(req.body.tags || []),
        order_index: req.body.order_index ?? 0,
        options: toDbJson(options),
        extras: toDbJson(req.body.extras ?? extras),
      },
    });
    res.status(201).json(rowToItem(item));
  } catch (err) { next(err); }
});

router.patch('/items/:id', requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['stem', 'question_type', 'cefr_level', 'difficulty_band',
                     'score_weight', 'correct_answer', 'explanation', 'judge_score',
                     'objective', 'order_index'];
    const data = {};
    for (const key of allowed) {
      if (key in req.body) data[key] = req.body[key];
    }
    if ('tags' in req.body) data.tags = toDbJson(req.body.tags || []);
    if ('options' in req.body) {
      const { options, extras } = splitOptions(req.body.options);
      data.options = toDbJson(options);
      // A bare `options` update also refreshes `extras` (the _extras carve-out),
      // unless the caller sent `extras` explicitly below.
      if (!('extras' in req.body)) data.extras = toDbJson(extras);
    }
    if ('extras' in req.body) data.extras = toDbJson(req.body.extras || {});

    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No fields to update' });

    try {
      const item = await prisma.item.update({ where: { id: req.params.id }, data });
      res.json(rowToItem(item));
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Item not found' });
      throw e;
    }
  } catch (err) { next(err); }
});

router.delete('/items/:id', requireAdmin, async (req, res, next) => {
  try {
    try {
      await prisma.item.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Item not found' });
      throw e;
    }
  } catch (err) { next(err); }
});

export default router;
