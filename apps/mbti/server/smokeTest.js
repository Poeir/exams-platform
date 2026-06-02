import { buildPath } from '../src/lib/quizPath.js';

const apiBase = process.env.API_BASE_URL || 'http://localhost:3001';
const serviceKey = process.env.PARENT_API_KEY || process.env.PARENT_SERVICE_KEY || 'dev-parent-key';
const externalUserId = `smoke_${Date.now()}`;

const attempt = await request('/api/v1/assessment-attempts', {
  method: 'POST',
  headers: { 'X-API-Key': serviceKey },
  body: JSON.stringify({
    sourceSystem: 'smoke_test',
    externalUserId,
    email: `${externalUserId}@example.test`,
    displayName: 'Smoke Test User',
  }),
});

const responses = createCompleteResponses();
const result = await request(`/api/v1/assessment-attempts/${attempt.id}/complete`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${attempt.attemptToken}` },
  body: JSON.stringify({ version: '1.0', responses }),
});

const history = await request(`/api/v1/subjects/smoke_test/${externalUserId}/results`, {
  headers: { 'X-API-Key': serviceKey },
});

if (history.results[0]?.id !== result.id) {
  throw new Error('Saved result was not returned in subject history.');
}

console.info(`API smoke test passed: ${result.result.code} saved as ${result.id}`);

function createCompleteResponses() {
  const answers = {};
  const serialized = {};

  while (true) {
    const nextQuestion = buildPath(answers).find((question) => !answers[question.id]);
    if (!nextQuestion) return serialized;

    if (nextQuestion.format === 'slider') {
      const distribution = Object.fromEntries(nextQuestion.actions.map((action, index) => [
        action.id,
        index === 0 ? 100 : 0,
      ]));
      answers[nextQuestion.id] = { distribution, options: nextQuestion.actions };
      serialized[nextQuestion.id] = { distribution };
      continue;
    }

    const option = nextQuestion.options[0];
    answers[nextQuestion.id] = { optionId: option.id, w: option.w, next: option.next };
    serialized[nextQuestion.id] = option.id;
  }
}

async function request(path, options) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}
