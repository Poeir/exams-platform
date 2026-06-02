import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db.js';
import { rowToSection, parsePartNumber } from '../shape.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

router.post('/papers/:paperId/sections', requireAdmin, async (req, res, next) => {
  try {
    const { paperId } = req.params;
    const name = req.body.name || 'New section';
    const section = await prisma.section.create({
      data: {
        id: req.body.id || randomUUID(),
        paper_id: paperId,
        name,
        part_number: req.body.part_number ?? parsePartNumber(name),
        skill: req.body.skill ?? null,
        cefr: req.body.cefr ?? null,
        topic: req.body.topic ?? null,
        passage_length: req.body.passage_length ?? null,
        item_count: req.body.item_count ?? 0,
        section_score: req.body.section_score ?? 0,
        section_time_min: req.body.section_time_min ?? 0,
        passage_id: req.body.passage_id ?? null,
        passage_content: req.body.passage_content ?? '',
        order_index: req.body.order_index ?? 0,
      },
    });
    res.status(201).json(rowToSection(section, []));
  } catch (err) { next(err); }
});

router.patch('/sections/:id', requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['name', 'part_number', 'skill', 'cefr', 'topic',
                     'passage_length', 'item_count', 'section_score', 'section_time_min',
                     'passage_id', 'passage_content', 'order_index'];
    const data = {};
    for (const key of allowed) {
      if (key in req.body) data[key] = req.body[key];
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No fields to update' });

    try {
      const section = await prisma.section.update({ where: { id: req.params.id }, data });
      res.json(rowToSection(section, []));
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Section not found' });
      throw e;
    }
  } catch (err) { next(err); }
});

router.delete('/sections/:id', requireAdmin, async (req, res, next) => {
  try {
    try {
      await prisma.section.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Section not found' });
      throw e;
    }
  } catch (err) { next(err); }
});

export default router;
