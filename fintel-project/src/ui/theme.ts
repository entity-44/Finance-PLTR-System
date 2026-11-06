// Design tokens. CSS uses the same values as custom properties (styles.css); T.* is for SVG/canvas drawing.
export const T = {
  bg: '#000000',
  panel: '#0a0a0b',
  raised: '#111113',
  line: '#1d1d21',
  lineHi: '#2c2c32',
  text: '#ededee',
  dim: '#9a9aa2',
  faint: '#5d5d66',
  up: '#22c55e',
  down: '#ef4444',
  accent: '#7dd3fc',
  accent2: '#a78bfa',
  mono: "'JetBrains Mono', ui-monospace, Menlo, monospace",
  sans: "'DM Sans', system-ui, -apple-system, sans-serif",
} as const;

export const tone = (v: number | null | undefined, invert = false) =>
  v == null || v === 0 || !Number.isFinite(v) ? T.dim : (v > 0) !== invert ? T.up : T.down;

/** Diverging colour for heatmap tiles: change % to a red-grey-green scale, saturating at ±cap. */
export function heat(v: number | null | undefined, cap = 3): string {
  if (v == null || !Number.isFinite(v)) return '#1a1a1d';
  const k = Math.max(-1, Math.min(1, v / cap));
  const base = [26, 26, 29];
  const to = k >= 0 ? [22, 163, 74] : [220, 38, 38];
  const a = Math.abs(k) ** 0.8;
  const c = base.map((b, i) => Math.round(b + (to[i] - b) * a));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
