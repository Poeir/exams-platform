import { prisma } from './db.js';
import { splitOptions, parsePartNumber } from './shape.js';
import { toDbJson } from './json.js';

// Upsert an export bundle ({ papers: [{ paper, sections: [{ ..., items }] }] })
// into the database. A paper's sections are replaced wholesale on each run
// (delete + recreate), which cascade-clears their items. Shared by the CLI
// seed script (src/seed.js) and the admin POST /api/seed route.
export async function seedBundle(bundle) {
  const summary = { papers: 0, sections: 0, items: 0 };

  await prisma.$transaction(async (tx) => {
    for (const wrapper of bundle.papers || []) {
      const paper = wrapper.paper;
      const paperData = {
        name: paper.name,
        description: paper.description ?? null,
        status: paper.status ?? null,
        total_score: paper.total_score ?? null,
        time_limit_min: paper.time_limit_min ?? null,
        completed_at: paper.completed_at || null,
      };
      await tx.paper.upsert({
        where: { id: paper.id },
        update: paperData,
        create: { id: paper.id, created_at: paper.created_at || undefined, ...paperData },
      });
      summary.papers++;

      // Replace the paper's sections wholesale (cascade-deletes their items).
      await tx.section.deleteMany({ where: { paper_id: paper.id } });

      let sectionOrder = 0;
      for (const s of wrapper.sections || []) {
        await tx.section.create({
          data: {
            id: s.id,
            paper_id: paper.id,
            name: s.name,
            part_number: parsePartNumber(s.name),
            skill: s.skill ?? null,
            cefr: s.cefr ?? null,
            topic: s.topic ?? null,
            passage_length:
              s.passage_length === 'none' || s.passage_length == null
                ? null
                : Number(s.passage_length) || null,
            item_count: s.item_count || (s.items ? s.items.length : 0),
            section_score: s.section_score || 0,
            section_time_min: s.section_time_min || 0,
            passage_id: s.passage_id || null,
            passage_content: s.passage_content || '',
            order_index: sectionOrder++,
          },
        });
        summary.sections++;

        let itemOrder = 0;
        for (const it of s.items || []) {
          const { options, extras } = splitOptions(it.options);
          await tx.item.create({
            data: {
              id: it.id,
              section_id: s.id,
              stem: it.stem,
              question_type: it.question_type ?? null,
              cefr_level: it.cefr_level ?? null,
              difficulty_band: it.difficulty_band ?? null,
              score_weight: it.score_weight ?? 1,
              correct_answer: it.correct_answer,
              explanation: it.explanation ?? null,
              judge_score: it.judge_score ?? null,
              objective: it.objective ?? null,
              tags: toDbJson(it.tags || []),
              order_index: itemOrder++,
              options: toDbJson(options),
              extras: toDbJson(extras),
            },
          });
          summary.items++;
        }
      }
    }
  }, { maxWait: 10_000, timeout: 120_000 });

  return summary;
}
