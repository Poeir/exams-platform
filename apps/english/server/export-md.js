// Fetches a paper from the API and writes a Markdown review document.
// Usage: node export-md.js [paperId] [outFile]
import { writeFileSync } from 'node:fs';

const API = process.env.API_BASE || 'http://localhost:3001/api';
const paperId = process.argv[2] || (await pickFirstPaper());
const outFile = process.argv[3] || 'exam-review.md';

async function pickFirstPaper() {
  const res = await fetch(`${API}/papers`);
  const papers = await res.json();
  if (!papers.length) throw new Error('No papers found');
  return papers[0].id;
}

const res = await fetch(`${API}/papers/${paperId}`);
if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
const { paper, sections } = await res.json();

const L = [];
const w = (s = '') => L.push(s);

w(`# ${paper.name}`);
w();
if (paper.description) w(`> ${paper.description}`);
w();
w('| Field | Value |');
w('| --- | --- |');
w(`| Paper ID | \`${paper.id}\` |`);
w(`| Status | ${paper.status} |`);
w(`| Total score | ${paper.total_score} |`);
w(`| Time limit | ${paper.time_limit_min} min |`);
w(`| Sections | ${sections.length} |`);
w(`| Created | ${paper.created_at} |`);
w(`| Completed | ${paper.completed_at ?? '—'} |`);
w();

// Answer-key summary table
w('## Answer key (quick reference)');
w();
w('| # | Section | Item ID | Correct | Weight | CEFR | Judge |');
w('| --- | --- | --- | --- | --- | --- | --- |');
let n = 0;
for (const s of sections) {
  for (const it of s.items) {
    n++;
    w(`| ${n} | ${esc(s.name)} | \`${it.id.slice(0, 8)}\` | **${it.correct_answer ?? '—'}** | ${it.score_weight ?? '—'} | ${it.cefr_level ?? '—'} | ${it.judge_score ?? '—'} |`);
  }
}
w();
w('---');
w();

// Full detail per section
for (const s of sections) {
  w(`## ${s.name}`);
  w();
  const meta = [];
  if (s.skill) meta.push(`**Skill:** ${s.skill}`);
  if (s.cefr) meta.push(`**CEFR:** ${s.cefr}`);
  if (s.section_score != null) meta.push(`**Score:** ${s.section_score}`);
  if (s.section_time_min != null) meta.push(`**Time:** ${s.section_time_min} min`);
  if (s.item_count != null) meta.push(`**Items:** ${s.item_count}`);
  if (meta.length) { w(meta.join(' · ')); w(); }
  if (s.topic) { w(`*Topic:* ${s.topic}`); w(); }
  if (s.passage_content && String(s.passage_content).trim()) {
    w('**Passage:**');
    w();
    w('> ' + String(s.passage_content).trim().replace(/\n/g, '\n> '));
    w();
  }

  s.items.forEach((it, i) => {
    w(`### Q${i + 1} — ${esc(it.stem || '(no stem)')}`);
    w();
    const tag = [];
    if (it.question_type) tag.push(`type: ${it.question_type}`);
    if (it.cefr_level) tag.push(`CEFR: ${it.cefr_level}`);
    if (it.difficulty_band) tag.push(`difficulty: ${it.difficulty_band}`);
    if (it.score_weight != null) tag.push(`weight: ${it.score_weight}`);
    if (tag.length) { w(`\`${tag.join(' | ')}\``); w(); }

    const { _extras = {}, ...opts } = it.options || {};
    for (const [k, v] of Object.entries(opts)) {
      const mark = k === it.correct_answer ? ' ✅' : '';
      w(`- **${k}.** ${esc(v)}${mark}`);
    }
    w();
    if (it.correct_answer) w(`**Correct answer:** ${it.correct_answer}`);
    if (it.objective) w(`**Objective:** ${esc(it.objective)}`);
    if (it.tags && it.tags.length) w(`**Tags:** ${it.tags.join(', ')}`);
    if (it.explanation) { w(); w(`**Explanation:** ${esc(it.explanation)}`); }

    // Media / extras (audio script, image prompt, urls)
    const ex = _extras;
    if (ex && Object.keys(ex).length) {
      w();
      if (ex.audio_script) w(`**Audio script:** ${esc(ex.audio_script)}`);
      if (ex.image_prompt) w(`**Image prompt:** ${esc(ex.image_prompt)}`);
      if (ex.audio_url) w(`**Audio:** ${ex.audio_url}`);
      if (ex.image_url) w(`**Image:** ${ex.image_url}`);
      if (ex.media_status) w(`**Media status:** ${ex.media_status}`);
    }
    w();
  });
  w('---');
  w();
}

function esc(s) {
  return String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

writeFileSync(outFile, L.join('\n'), 'utf8');
console.log(`Wrote ${outFile} (${n} items, ${sections.length} sections)`);
