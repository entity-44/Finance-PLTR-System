import { getText, pool } from '@/lib/http';
import { isoDaysAgo } from '@/lib/format';
import type { SourceDef } from './store';

// FRED (Federal Reserve Bank of St. Louis) public CSV download: no key needed. Reached through /px/fred.

export interface Obs { d: string; v: number }
export type Series = Obs[];

/** Parse fredgraph.csv. Blank or "." means no observation for that date (e.g. delayed releases) and is skipped. */
export function parseFredCsv(csv: string): Series {
  const lines = csv.trim().split(/\r?\n/);
  const out: Series = [];
  for (let i = 1; i < lines.length; i++) {
    const [d, raw] = lines[i].split(',');
    if (!d || raw === undefined) continue;
    const s = raw.trim();
    if (s === '' || s === '.') continue;
    const v = Number(s);
    if (Number.isFinite(v)) out.push({ d, v });
  }
  return out;
}

export async function fredSeries(id: string, sinceDays: number): Promise<Series> {
  const csv = await getText(`/px/fred/graph/fredgraph.csv?id=${id}&cosd=${isoDaysAgo(sinceDays)}`);
  if (!csv.startsWith('observation_date') && !csv.startsWith('DATE')) throw new Error(`FRED ${id}: unexpected response`);
  return parseFredCsv(csv);
}

export async function fredMany(ids: string[], sinceDays: number): Promise<Record<string, Series>> {
  const res = await pool(ids, 6, (id) => fredSeries(id, sinceDays));
  const out: Record<string, Series> = {};
  ids.forEach((id, i) => { if (res[i]?.length) out[id] = res[i]!; });
  return out;
}

export function fredSource(id: string, label: string, ids: string[], sinceDays: number, every = 30 * 60_000): SourceDef<Record<string, Series>> {
  return { id, label, provider: 'FRED', every, fetch: () => fredMany(ids, sinceDays) };
}

// ---- helpers over series ----
export const last = (s?: Series): Obs | undefined => s?.[s.length - 1];

/** Value at or before a date (YYYY-MM-DD). */
export function atOrBefore(s: Series | undefined, iso: string): Obs | undefined {
  if (!s) return undefined;
  for (let i = s.length - 1; i >= 0; i--) if (s[i].d <= iso) return s[i];
  return undefined;
}

/** Year-over-year % change for a monthly index series (needs the same month a year earlier). */
export function yoy(s: Series | undefined, offset = 0): Obs | undefined {
  if (!s || s.length < 13) return undefined;
  const cur = s[s.length - 1 - offset];
  if (!cur) return undefined;
  const target = (Number(cur.d.slice(0, 4)) - 1) + cur.d.slice(4);
  const prev = s.find((o) => o.d === target);
  return prev ? { d: cur.d, v: (cur.v / prev.v - 1) * 100 } : undefined;
}

/** Series of YoY % for the last n points. */
export function yoySeries(s: Series | undefined, n: number): Series {
  const out: Series = [];
  if (!s) return out;
  for (let k = Math.min(n, s.length) - 1; k >= 0; k--) { const o = yoy(s, k); if (o) out.push(o); }
  return out;
}

/** Period-over-period change (difference) series. */
export function diffSeries(s: Series | undefined): Series {
  if (!s) return [];
  return s.slice(1).map((o, i) => ({ d: o.d, v: o.v - s[i].v }));
}
export function pctChangeSeries(s: Series | undefined): Series {
  if (!s) return [];
  return s.slice(1).map((o, i) => ({ d: o.d, v: (o.v / s[i].v - 1) * 100 }));
}
