import { TYPES } from '../data.js';

export const RESULT_TYPE_CODES = Object.freeze(Object.keys(TYPES));

export function isResultTypeCode(code) {
  return typeof code === 'string' && RESULT_TYPE_CODES.includes(code);
}

export function getResultType(code) {
  return TYPES[code] || TYPES.INFP;
}
