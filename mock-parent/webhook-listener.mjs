// Mock parent backend: receives result webhooks from BOTH assessment engines.
// Run: node webhook-listener.mjs   (listens on http://localhost:4000/callback)
//
// Both engines share ONE key and sign the same way —
// X-Signature: sha256=HMAC_SHA256(rawBody, PARENT_API_KEY) — and both send the
// same camelCase envelope (attemptId/sourceSystem/externalUserId/status:
// 'completed'/completedAt/result/engineVersion), so one verify + one DTO
// covers both.
import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

const PORT = 4000;
const PARENT_API_KEY = process.env.PARENT_API_KEY || 'dev-parent-key';

function signatureFor(rawBody) {
  return 'sha256=' + createHmac('sha256', PARENT_API_KEY).update(rawBody).digest('hex');
}

function verify(rawBody, got) {
  const want = signatureFor(rawBody);
  return got.length === want.length
    && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/callback') {
    res.writeHead(404).end('not found');
    return;
  }

  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    const ok = verify(raw, req.headers['x-signature'] || '');
    const payload = JSON.parse(raw);
    // paperId is present only on english payloads; result.code only on mbti.
    const engine = payload.paperId ? 'english' : (payload.result?.code ? 'mbti' : 'unknown');

    console.log('\n========== WEBHOOK RECEIVED ==========');
    console.log('time              :', new Date().toISOString());
    console.log('engine            :', engine);
    console.log('X-Attempt-Id      :', req.headers['x-attempt-id']);
    console.log('X-Signature valid :', ok ? 'YES ✅' : 'NO ❌ (reject this!)');
    console.log('payload           :');
    console.log(JSON.stringify(payload, null, 2));
    console.log('======================================\n');

    // A real parent would persist the result here, keyed by payload.attemptId.
    res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: ok }));
  });
}).listen(PORT, () => {
  console.log(`mock parent listening on http://localhost:${PORT}/callback`);
  console.log('verifying signatures with PARENT_API_KEY');
});
