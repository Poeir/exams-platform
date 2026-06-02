import { buildResultRecord, validateResultPayload } from './resultContract.js';

const STORAGE_KEY = 'mbti.mock-parent.database.v1';

export const MOCK_USERS = Object.freeze([
  { id: 'usr_test_001', email: 'alice@example.test', name: 'Alice' },
  { id: 'usr_test_002', email: 'bob@example.test', name: 'Bob' },
]);

function createId(prefix) {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${id}`;
}

function readDatabase() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { attempts: [], results: [] };

  try {
    return JSON.parse(raw);
  } catch {
    return { attempts: [], results: [] };
  }
}

function writeDatabase(database) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

export function createMockAttempt(userId) {
  const user = MOCK_USERS.find((item) => item.id === userId);
  if (!user) throw new Error('Mock parent user was not found.');

  const database = readDatabase();
  const attempt = {
    id: createId('att'),
    attemptToken: createId('dev_token'),
    userId: user.id,
    status: 'started',
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  database.attempts.push(attempt);
  writeDatabase(database);
  return attempt;
}

export function completeMockAttempt(attemptToken, payload) {
  validateResultPayload(payload);

  const database = readDatabase();
  const attempt = database.attempts.find((item) => item.attemptToken === attemptToken);
  if (!attempt || attempt.status !== 'started') {
    throw new Error('Attempt token is invalid or already completed.');
  }
  if (payload.attemptId && payload.attemptId !== attempt.id) {
    throw new Error('Assessment result does not match its attempt.');
  }

  const user = MOCK_USERS.find((item) => item.id === attempt.userId);
  const result = buildResultRecord({
    id: createId('res'),
    attemptId: attempt.id,
    user,
    payload,
    source: 'mock-parent',
  });

  attempt.status = 'completed';
  attempt.completedAt = result.completedAt;
  database.results.push(result);
  writeDatabase(database);
  return result;
}

export function getMockResult(resultId) {
  return readDatabase().results.find((result) => result.id === resultId) || null;
}

export function getMockResultsForUser(userId) {
  return readDatabase().results
    .filter((result) => result.userId === userId)
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt));
}
