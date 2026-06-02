// JSON (de)serialisation for the NVARCHAR(MAX) columns that used to be native
// `Json` under PostgreSQL. SQL Server has no JSON type, so these columns store
// stringified JSON and the query layer converts at the boundary:
//   - write path: toDbJson(value)  → string | null
//   - read path:  fromDbJson(value, fallback) → parsed value
//
// fromDbJson is intentionally tolerant: it passes through values that are
// already objects (so the same shapers keep working mid-migration or under a
// future provider that does return parsed JSON) and falls back on null/blank.

export function toDbJson(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

export function fromDbJson(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') return value; // already parsed
  if (value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
