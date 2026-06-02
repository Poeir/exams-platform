// Base-path helper. The app is served either at '/' (standalone dev) or under
// a prefix like '/mbti/' when hosted by the exam gateway. Vite injects the
// build-time base (`vite build --base=/mbti/`) as import.meta.env.BASE_URL;
// in dev it is '/'. Use for public assets referenced by absolute string paths
// (e.g. /mascots/*.png), which Vite does not rewrite automatically.
const RAW = import.meta.env.BASE_URL || '/';

// '' when served at root, '/mbti' under the gateway (no trailing slash).
export const BASE = RAW.endsWith('/') ? RAW.slice(0, -1) : RAW;

// Prefix an absolute app path: withBase('/mascots/gon.png') -> '/mbti/mascots/gon.png'.
export const withBase = (path) => `${BASE}${path}`;
