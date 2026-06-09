// One-off migration: move item media (image_url / audio_url in the `extras`
// column) off Cloudinary and into the Azure Blob container, rewriting each
// stored value from a full Cloudinary URL to the opaque blob name the app now
// serves via GET /api/media/:name.
//
// Idempotent: rows whose media is already a blob name (no http host) are
// skipped, so re-running only picks up anything still on Cloudinary.
//
//   cd apps/english/server
//   node scripts/migrate-media-to-azure.js --dry-run   # report only
//   node scripts/migrate-media-to-azure.js             # apply
//
// Requires the same AZURE_STORAGE_* env the server uses (loaded from .env).
import { prisma } from '../src/db.js';
import { fromDbJson, toDbJson } from '../src/json.js';
import { isConfigured, makeBlobName, uploadBlob } from '../src/azureStorage.js';

const DRY_RUN = process.argv.includes('--dry-run');
const MEDIA_FIELDS = ['image_url', 'audio_url'];
const isCloudinary = (v) => typeof v === 'string' && /^https?:\/\/[^/]*cloudinary\.com\//i.test(v);

async function migrateOne(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const body = Buffer.from(await res.arrayBuffer());
  const filename = new URL(url).pathname.split('/').pop() || 'media';
  const name = makeBlobName(filename);
  if (!DRY_RUN) await uploadBlob(name, contentType, body);
  return { name, bytes: body.length, contentType };
}

async function main() {
  if (!isConfigured()) {
    console.error('Azure storage not configured — set AZURE_STORAGE_ACCOUNT / AZURE_STORAGE_CONTAINER / AZURE_STORAGE_SAS');
    process.exit(1);
  }
  const items = await prisma.item.findMany({ select: { id: true, extras: true } });
  let scanned = 0;
  let moved = 0;

  for (const row of items) {
    const extras = fromDbJson(row.extras, {});
    if (!extras || typeof extras !== 'object') continue;
    let changed = false;

    for (const field of MEDIA_FIELDS) {
      const value = extras[field];
      if (!isCloudinary(value)) continue;
      scanned++;
      try {
        const { name, bytes, contentType } = await migrateOne(value);
        extras[field] = name;
        changed = true;
        moved++;
        console.log(`${DRY_RUN ? '[dry] ' : ''}item ${row.id} ${field}: ${value}\n    -> ${name} (${bytes} bytes, ${contentType})`);
      } catch (e) {
        console.error(`FAILED item ${row.id} ${field}: ${value} — ${e.message}`);
      }
    }

    if (changed && !DRY_RUN) {
      await prisma.item.update({ where: { id: row.id }, data: { extras: toDbJson(extras) } });
    }
  }

  console.log(`\nDone. ${moved}/${scanned} Cloudinary asset(s) ${DRY_RUN ? 'would be moved' : 'moved'} across ${items.length} item(s).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
