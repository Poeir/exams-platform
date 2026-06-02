// ============================================================
// Donut picker — pure math for the slider question's interactive donut.
//   - evenDistribution: initial state with a remainder fix on the last id
//   - moveBoundary: drag a handle to a fractional position, rebalancing
//                   only the two adjacent slices, sum stays 100
//   - pointerAngleFraction: SVG pointer event → 0..1 fraction around circle
// ============================================================

const MIN_SLICE = 0.02; // 2% minimum per segment

export function evenDistribution(actions) {
  const even = Math.floor(100 / actions.length);
  const d = {};
  actions.forEach((a, i) => {
    d[a.id] = i === actions.length - 1
      ? 100 - even * (actions.length - 1)
      : even;
  });
  return d;
}

function cumulative(sizes) {
  const c = [0];
  for (let i = 0; i < sizes.length; i++) c.push(c[i] + sizes[i]);
  return c;
}

// Given current dist + ordered ids, move boundary handleIdx (1..n-1) to
// fractional newPos (0..1), resizing only the two adjacent segments. Returns
// the new dist object as integer percents summing to exactly 100.
export function moveBoundary(currentDist, ids, handleIdx, newPos) {
  const sizes = ids.map(id => (currentDist[id] || 0) / 100);
  const cum = cumulative(sizes);
  const lower = cum[handleIdx - 1] + MIN_SLICE;
  const upper = cum[handleIdx + 1] - MIN_SLICE;
  const clamped = Math.max(lower, Math.min(upper, newPos));

  const newSizes = [...sizes];
  newSizes[handleIdx - 1] = clamped - cum[handleIdx - 1];
  newSizes[handleIdx] = cum[handleIdx + 1] - clamped;

  const rounded = newSizes.map(s => Math.round(s * 100));
  const sum = rounded.reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    let maxIdx = 0;
    for (let i = 1; i < rounded.length; i++) {
      if (rounded[i] > rounded[maxIdx]) maxIdx = i;
    }
    rounded[maxIdx] += 100 - sum;
  }

  const next = {};
  ids.forEach((id, i) => { next[id] = rounded[i]; });
  return next;
}

// Convert a pointer event over the donut SVG into a 0..1 fraction
// measured clockwise from 12 o'clock. Returns null if the SVG isn't ready.
export function pointerAngleFraction(event, svgEl, viewBox = 260, center = 130) {
  if (!svgEl) return null;
  const rect = svgEl.getBoundingClientRect();
  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;
  const sx = (px / rect.width) * viewBox;
  const sy = (py / rect.height) * viewBox;
  const dx = sx - center;
  const dy = sy - center;
  let raw = Math.atan2(dy, dx) + Math.PI / 2;
  while (raw < 0) raw += 2 * Math.PI;
  while (raw >= 2 * Math.PI) raw -= 2 * Math.PI;
  return raw / (2 * Math.PI);
}

// Helper: cumulative fractions (0..1) per slice, useful for laying out arcs.
export function sliceCumulative(actions, dist) {
  const sizes = actions.map(a => (dist[a.id] || 0) / 100);
  return { sizes, cum: cumulative(sizes) };
}
