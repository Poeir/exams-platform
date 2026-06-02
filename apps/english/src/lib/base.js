// Base-path helpers. The app is served either at '/' (standalone dev) or under
// a prefix like '/english/' when hosted by the exam gateway. Vite injects the
// build-time base (`vite build --base=/english/`) as import.meta.env.BASE_URL;
// in dev it is '/'.
const RAW = import.meta.env.BASE_URL || '/';

// '' when served at root, '/english' under the gateway (no trailing slash).
export const BASE = RAW.endsWith('/') ? RAW.slice(0, -1) : RAW;

// Prefix an absolute app path: withBase('/voice/x.mp3') -> '/english/voice/x.mp3'.
export const withBase = (path) => `${BASE}${path}`;

// Turn a browser pathname into an app-relative path for route matching:
// '/english/exam/full' -> '/exam/full'; passthrough when there is no prefix.
export const stripBase = (pathname) => {
  if (BASE && pathname.startsWith(BASE)) {
    const rest = pathname.slice(BASE.length);
    return rest === '' ? '/' : rest;
  }
  return pathname;
};
