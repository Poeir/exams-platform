import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from './db.js';
import { seedBundle } from './seedCore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = process.argv[2] || join(__dirname, '..', '..', 'papers_export_1_full.json');

const bundle = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
console.log(`Seeding from ${JSON_PATH} (${bundle.papers?.length || 0} paper bundles)`);

const summary = await seedBundle(bundle);

console.log('Done:', summary);
await prisma.$disconnect();
