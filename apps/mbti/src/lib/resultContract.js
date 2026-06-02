import { isResultTypeCode } from './resultCatalog.js';

export const RESULT_PAYLOAD_VERSION = '1.0';

export function validateResultPayload(payload) {
  if (!payload || payload.version !== RESULT_PAYLOAD_VERSION) {
    throw new Error('Unsupported assessment result payload version.');
  }

  if (!payload.result || !isResultTypeCode(payload.result.code)) {
    throw new Error('Invalid MBTI result code.');
  }

  if (!payload.result.axes || typeof payload.result.axes !== 'object') {
    throw new Error('Assessment result axes are required.');
  }

  return payload;
}

export function buildResultRecord({
  id,
  attemptId = null,
  user = null,
  payload,
  source = 'local-preview',
}) {
  validateResultPayload(payload);

  return {
    id,
    attemptId,
    userId: user?.id ?? payload.userId ?? null,
    user: user
      ? { id: user.id, email: user.email, name: user.name }
      : null,
    source,
    completedAt: payload.completedAt,
    result: payload.result,
    responses: payload.responses,
  };
}
