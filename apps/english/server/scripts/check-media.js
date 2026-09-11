// Read-only audit: classify every item's media references (image_url / audio_url
// in the `extras` JSON column) as Cloudinary URL vs Azure blob name vs other,
// so you can tell at a glance whether the current DB is still on Cloudinary or
// has been migrated to Azure Blob Storage.
//
// Connects to whatever DB the server is pointed at (DB_DATABASE in .env, via the
// same managed-identity adapter the app uses). Reads only — never writes, never
// needs AZURE_STORAGE_* configured.
//
//   cd apps/english/server
//   node scripts/check-media.js
//
import { prisma } from '../src/db.js';
import { fromDbJson } from '../src/json.js';

const MEDIA_FIELDS = ['image_url', 'audio_url'];
const isCloudinary = (v) => /^https?:\/\/[^/]*cloudinary\.com\//i.test(v);
const isHttp = (v) => /^https?:\/\//i.test(v);
// A local static asset bundled with the SPA (public/voice/*, public/img/*, ...),
// referenced by an absolute path. NOT in any blob store — resolveMediaUrl() would
// (mis)route these through /api/media/, so they only work if also present in the
// container; flag them separately.
const isLocalPath = (v) => v.startsWith('/');
// An Azure blob name minted by makeBlobName(): randomUUID() + optional extension.
const isAzureBlob = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]+)?$/i.test(v);

function classify(v) {
  if (isCloudinary(v)) return 'cloudinary';
  if (isHttp(v)) return 'otherHttp';
  if (isLocalPath(v)) return 'localPath';
  if (isAzureBlob(v)) return 'azureBlob';
  return 'unknown';
}

async function main() {
  const items = await prisma.item.findMany({ select: { id: true, extras: true } });

  const counts = { cloudinary: 0, azureBlob: 0, localPath: 0, otherHttp: 0, unknown: 0 };
  const samples = { cloudinary: [], azureBlob: [], localPath: [], otherHttp: [], unknown: [] };

  for (const row of items) {
    const extras = fromDbJson(row.extras, {});
    if (!extras || typeof extras !== 'object') continue;

    for (const field of MEDIA_FIELDS) {
      const v = extras[field];
      if (!v || typeof v !== 'string') continue;

      const kind = classify(v);
      counts[kind]++;
      if (samples[kind].length < 3) samples[kind].push(`item ${row.id} ${field}: ${v}`);
    }
  }

  const totalMedia = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\n=== media audit ===`);
  console.log(`items scanned        : ${items.length}`);
  console.log(`media references     : ${totalMedia}`);
  console.log(`  Cloudinary URLs    : ${counts.cloudinary}`);
  console.log(`  Azure blob names   : ${counts.azureBlob}  (UUID, served via /api/media/:name)`);
  console.log(`  local static paths : ${counts.localPath}  (/voice/*, bundled with the SPA — not a blob store)`);
  console.log(`  other http URLs    : ${counts.otherHttp}`);
  console.log(`  unrecognised       : ${counts.unknown}`);

  console.log(`\n--- samples ---`);
  for (const k of Object.keys(samples)) {
    for (const s of samples[k]) console.log(`  [${k}] ${s}`);
  }

  const verdict =
    totalMedia === 0 ? 'no media references found'
    : counts.cloudinary === 0 ? 'no Cloudinary left (migrated to Azure / local)'
    : counts.azureBlob === 0 ? 'NOT migrated — media still on Cloudinary (+ local paths)'
    : 'MIXED — some Cloudinary remains, run scripts/migrate-media-to-azure.js';
  console.log(`\nverdict: ${verdict}\n`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
