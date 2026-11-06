// Number and date formatting. Every function returns '—' for missing values instead of inventing one.

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function num(v: number | null | undefined, dp = 2): string {
  if (!isNum(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/** Price with sensible precision: 4 dp under 10 (FX), 2 dp otherwise. */
export function price(v: number | null | undefined): string {
  if (!isNum(v)) return '—';
  const a = Math.abs(v);
  return num(v, a >= 10000 ? 0 : a >= 10 ? 2 : a >= 1 ? 4 : 5);
}

export function pct(v: number | null | undefined, dp = 2, sign = true): string {
  if (!isNum(v)) return '—';
  return (sign && v > 0 ? '+' : '') + v.toFixed(dp) + '%';
}

export function signed(v: number | null | undefined, dp = 2): string {
  if (!isNum(v)) return '—';
  return (v > 0 ? '+' : '') + num(v, dp);
}

/** 1234567 -> 1.23M. Units: the value's own units. */
export function big(v: number | null | undefined, dp = 2): string {
  if (!isNum(v)) return '—';
  const a = Math.abs(v), s = v < 0 ? '-' : '';
  if (a >= 1e12) return s + (a / 1e12).toFixed(dp) + 'T';
  if (a >= 1e9) return s + (a / 1e9).toFixed(dp) + 'B';
  if (a >= 1e6) return s + (a / 1e6).toFixed(dp) + 'M';
  if (a >= 1e3) return s + (a / 1e3).toFixed(dp > 1 ? 1 : dp) + 'K';
  return s + a.toFixed(dp);
}

/** Basis points from a difference in percentage points. */
export function bp(v: number | null | undefined): string {
  if (!isNum(v)) return '—';
  const b = Math.round(v * 100);
  return (b > 0 ? '+' : '') + b + 'bp';
}

export function ago(ts: number | undefined, now = Date.now()): string {
  if (!ts) return '—';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '2026-10-01' -> 'Oct 1, 2026' (no timezone shifting). */
export function dateLabel(iso: string | undefined, withYear = true): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m) return iso;
  return MON[m - 1] + (d ? ' ' + d : '') + (withYear ? ', ' + y : '');
}
export function monthLabel(iso: string | undefined): string {
  if (!iso) return '—';
  const [y, m] = iso.slice(0, 7).split('-').map(Number);
  return MON[m - 1] + ' ' + y;
}

export function isoDaysAgo(days: number, from = new Date()): string {
  const d = new Date(from.getTime() - days * 864e5);
  return d.toISOString().slice(0, 10);
}

export function toneClass(v: number | null | undefined, invert = false): 'up' | 'down' | 'flat' {
  if (!isNum(v) || v === 0) return 'flat';
  return (v > 0) !== invert ? 'up' : 'down';
}
