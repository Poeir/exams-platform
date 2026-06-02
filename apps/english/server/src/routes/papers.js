import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db.js';
import { rowToPaper, rowToSection, rowToItem, publicItem, paperVariant } from '../shape.js';
import { scoreAnswers } from '../scoring.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

router.get('/papers', async (_req, res, next) => {
  try {
    const papers = await prisma.paper.findMany({ orderBy: { created_at: 'desc' } });
    // `variant` ('full' | 'short') is keyed off the paper NAME — see
    // paperVariant() in shape.js. Clients and the parent site use it to pick
    // which question set to load.
    res.json(papers.map((p) => ({ ...rowToPaper(p), variant: paperVariant(p.name) })));
  } catch (err) { next(err); }
});

// Conditional middleware: only require admin auth when ?withAnswers=1, since
// that view leaks the answer key + explanation. The taker view stays public.
function maybeRequireAdmin(req, res, next) {
  const withAnswers = req.query.withAnswers === '1' || req.query.withAnswers === 'true';
  if (withAnswers) return requireAdmin(req, res, next);
  next();
}

router.get('/papers/:id', maybeRequireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const paper = await prisma.paper.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: [{ part_number: 'asc' }, { order_index: 'asc' }, { id: 'asc' }],
          include: { items: { orderBy: [{ order_index: 'asc' }, { id: 'asc' }] } },
        },
      },
    });
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    // Admin/editor callers pass ?withAnswers=1 (gated above) to get the full
    // item shape including correct_answer + explanation.
    const withAnswers = req.query.withAnswers === '1' || req.query.withAnswers === 'true';
    const shapeItems = (items) => {
      const shaped = items.map(rowToItem);
      return withAnswers ? shaped : shaped.map(publicItem);
    };

    const sections = paper.sections.map((s) => rowToSection(s, shapeItems(s.items)));
    res.json({ paper: rowToPaper(paper), sections });
  } catch (err) { next(err); }
});

// Score a submission server-side. The answer key never leaves the server: the
// client posts only its answers and gets back aggregate totals.
router.post('/papers/:id/score', async (req, res, next) => {
  try {
    const { id } = req.params;
    const answers = (req.body && req.body.answers) || {};

    const paper = await prisma.paper.findUnique({ where: { id }, select: { id: true } });
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    const items = await prisma.item.findMany({
      where: { section: { paper_id: id } },
      orderBy: [
        { section: { part_number: 'asc' } },
        { section: { order_index: 'asc' } },
        { order_index: 'asc' },
      ],
      select: { id: true, correct_answer: true, section: { select: { name: true, skill: true } } },
    });
    const rows = items.map((i) => ({
      id: i.id,
      correct_answer: i.correct_answer,
      section_name: i.section.name,
      section_skill: i.section.skill,
    }));

    res.json(scoreAnswers(rows, answers));
  } catch (err) { next(err); }
});

router.post('/papers', requireAdmin, async (req, res, next) => {
  try {
    const { name = 'Untitled paper', description = null, status = 'draft',
            total_score = 0, time_limit_min = 0 } = req.body;
    const paper = await prisma.paper.create({
      data: {
        id: req.body.id || randomUUID(),
        name, description, status, total_score, time_limit_min,
      },
    });
    res.status(201).json(rowToPaper(paper));
  } catch (err) { next(err); }
});

router.patch('/papers/:id', requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['name', 'description', 'status', 'total_score', 'time_limit_min', 'completed_at'];
    const data = {};
    for (const key of allowed) {
      if (key in req.body) data[key] = req.body[key];
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No fields to update' });

    try {
      const paper = await prisma.paper.update({ where: { id: req.params.id }, data });
      res.json(rowToPaper(paper));
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Paper not found' });
      throw e;
    }
  } catch (err) { next(err); }
});

router.delete('/papers/:id', requireAdmin, async (req, res, next) => {
  try {
    try {
      await prisma.paper.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Paper not found' });
      throw e;
    }
  } catch (err) { next(err); }
});

export default router;
