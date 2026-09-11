// Bring each item's `extras` column in the DB in line with papers_export_1_full.json
// (the seed source, whose media is already Azure blob names — UUID.mp3/.png).
// Use this to fix a DB that still carries old Cloudinary URLs without doing a full
// destructive re-seed (seedBundle deletes + recreates every section/item).
//
// Matches items by id; for each item present in the JSON it rewrites the `extras`
// column to exactly what a seed would produce (splitOptions(it.options) — same
// transform as seedCore.js), so media_id / audio_url / image_url / audio_script
// all line up. Items not in the JSON are left untouched.
//
//   cd apps/english/server
//   node scripts/reconcile-media.js                       # dry-run (default), reports diffs
//   node scripts/reconcile-media.js --apply               # write changes
//   node scripts/reconcile-media.js ../some-other.json --apply
//
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../src/db.js';
import { splitOptions } from '../src/shape.js';
import { fromDbJson, toDbJson } from '../src/json.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');
const jsonArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const JSON_PATH = jsonArg
  ? (jsonArg.startsWith('/') || /^[a-z]:[\\/]/i.test(jsonArg) ? jsonArg : join(process.cwd(), jsonArg))
  : join(__dirname, '..', '..', 'papers_export_1_full.json');

const MEDIA_FIELDS = ['image_url', 'audio_url'];

function summariseMedia(extras) {
  return MEDIA_FIELDS.map((f) => extras?.[f]).filter(Boolean).join(', ') || '(none)';
}

async function main() {
  const bundle = JSON.parse(readFileSync(JSON_PATH, 'utf8'));

  // Build id -> desired extras (exactly as seedCore.js would write it).
  const desired = new Map();
  for (const wrapper of bundle.papers || []) {
    for (const s of wrapper.sections || []) {
      for (const it of s.items || []) {
        const { extras } = splitOptions(it.options);
        desired.set(it.id, extras || {});
      }
    }
  }
  console.log(`JSON: ${JSON_PATH}`);
  console.log(`items in JSON: ${desired.size}`);

  const dbItems = await prisma.item.findMany({ select: { id: true, extras: true } });

  let matched = 0, changed = 0, mediaChanged = 0;
  const updates = [];

  for (const row of dbItems) {
    const want = desired.get(row.id);
    if (!want) continue;
    matched++;

    const current = fromDbJson(row.extras, {});
    const wantJson = toDbJson(want);
    if (toDbJson(current) === wantJson) continue;
    changed++;

    const beforeMedia = summariseMedia(current);
    const afterMedia = summariseMedia(want);
    if (beforeMedia !== afterMedia) {
      mediaChanged++;
      console.log(`item ${row.id}`);
      console.log(`    media: ${beforeMedia}`);
      console.log(`        -> ${afterMedia}`);
    }
    updates.push({ id: row.id, extras: wantJson });
  }

  console.log(`\nmatched by id      : ${matched}/${dbItems.length} db items`);
  console.log(`extras differing   : ${changed}`);
  console.log(`  of which media   : ${mediaChanged}`);

  if (!APPLY) {
    console.log(`\n[dry-run] no changes written. Re-run with --apply to update.`);
    await prisma.$disconnect();
    return;
  }

  for (const u of updates) {
    await prisma.item.update({ where: { id: u.id }, data: { extras: u.extras } });
  }
  console.log(`\napplied: ${updates.length} item(s) updated.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
