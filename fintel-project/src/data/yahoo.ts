import { useEffect } from 'react';
import { chunk, getJSON, pool } from '@/lib/http';
import { HOST, NODE, snap, snapTime, STATIC } from '@/lib/env';
import { run, useSource, type SourceDef } from './store';

// Yahoo Finance's public chart endpoints (no key). Dev: through /px/yahoo. Website: snapshot files.

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  prev: number | null;       // previous close (1-day window) or window start
  change: number | null;
  changePct: number | null;
  time: number;              // last trade, ms
  currency: string;
  spark: number[];           // closes over the window
  t?: number[];              // timestamps for spark, ms
  dayHigh?: number;
  dayLow?: number;
  yearHigh?: number;
  yearLow?: number;
  exchange?: string;
}

interface SparkMeta {
  symbol: string; shortName?: string; longName?: string; currency?: string;
  regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number; regularMarketTime?: number;
  regularMarketDayHigh?: number; regularMarketDayLow?: number; fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number;
  fullExchangeName?: string;
}
interface SparkResponse {
  spark: { result: { symbol: string; response?: { meta: SparkMeta; timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] }[] | null; error: unknown };
}

export function parseSpark(json: SparkResponse, daily = true, withTime = false): Record<string, Quote> {
  const out: Record<string, Quote> = {};
  for (const r of json.spark?.result ?? []) {
    const resp = r.response?.[0];
    const m = resp?.meta;
    if (!m || typeof m.regularMarketPrice !== 'number') continue;
    const raw = resp.indicators?.quote?.[0]?.close ?? [], ts = resp.timestamp ?? [];
    const closes: number[] = [], t: number[] = [];
    raw.forEach((v, i) => { if (typeof v === 'number') { closes.push(v); t.push((ts[i] ?? 0) * 1000); } });
    // For a 1-day window the change is versus yesterday's close; for longer windows, versus the window start.
    const prev = daily ? (m.previousClose ?? m.chartPreviousClose ?? null) : (m.chartPreviousClose ?? closes[0] ?? null);
    const change = prev != null ? m.regularMarketPrice - prev : null;
    out[r.symbol] = {
      symbol: r.symbol,
      name: m.shortName || m.longName || r.symbol,
      price: m.regularMarketPrice,
      prev,
      change,
      changePct: prev ? (change! / prev) * 100 : null,
      time: (m.regularMarketTime ?? 0) * 1000,
      currency: m.currency || '',
      spark: closes,
      ...(withTime ? { t } : {}),
      dayHigh: m.regularMarketDayHigh, dayLow: m.regularMarketDayLow,
      yearHigh: m.fiftyTwoWeekHigh, yearLow: m.fiftyTwoWeekLow,
      exchange: m.fullExchangeName,
    };
  }
  return out;
}

/** Live spark request (dev relay or Node). */
export async function sparkLive(symbols: string[], range = '1d', interval = '5m', withTime = false): Promise<Record<string, Quote>> {
  const groups = chunk([...new Set(symbols)], 20);
  const parts = await pool(groups, 3, (g) =>
    getJSON<SparkResponse>(`${HOST.yahoo}/v7/finance/spark?symbols=${g.map(encodeURIComponent).join(',')}&range=${range}&interval=${interval}`)
      .then((j) => parseSpark(j, range === '1d', withTime)));
  return Object.assign({}, ...parts.filter(Boolean));
}

// Website snapshot files written by scripts/snapshot.ts
export const SNAP_FILES = { '1d': 'quotes-1d.json', '1y': 'quotes-1y.json', '5y': 'quotes-5y.json' } as const;
const pickSyms = (all: Record<string, Quote>, syms: string[]) => Object.fromEntries(syms.filter((s) => all[s]).map((s) => [s, all[s]]));

/** Recompute change over the last n points of a daily series (for 1M / 6M windows cut from the 1-year file). */
function window(q: Quote, n: number): Quote {
  const c = q.spark.slice(-n), t = q.t?.slice(-n);
  const prev = c[0] ?? null;
  return { ...q, spark: c, t, prev, change: prev != null ? q.price - prev : null, changePct: prev ? ((q.price - prev) / prev) * 100 : null };
}

export async function spark(symbols: string[], range = '1d', interval = '5m'): Promise<Record<string, Quote>> {
  if (!STATIC) return sparkLive(symbols, range, interval);
  if (range === '1d') return pickSyms(await snap<Record<string, Quote>>(SNAP_FILES['1d']), symbols);
  const year = await snap<Record<string, Quote>>(SNAP_FILES['1y']);
  const n = range === '6mo' ? 127 : range === '3mo' ? 64 : range === '1mo' ? 22 : 260;
  return Object.fromEntries(symbols.filter((s) => year[s]).map((s) => [s, window(year[s], n)]));
}

export interface Bars { symbol: string; name: string; currency: string; t: number[]; c: number[]; prevClose: number | null }
interface ChartResponse {
  chart: { result: { meta: SparkMeta; timestamp?: number[]; indicators: { quote: { close: (number | null)[] }[] } }[] | null; error: { description?: string } | null };
}
export function parseChart(j: ChartResponse): Bars {
  const r = j.chart?.result?.[0];
  if (!r) throw new Error(j.chart?.error?.description || 'no data for this symbol');
  const ts = r.timestamp ?? [], cs = r.indicators.quote[0]?.close ?? [];
  const t: number[] = [], c: number[] = [];
  ts.forEach((x, i) => { const v = cs[i]; if (typeof v === 'number') { t.push(x * 1000); c.push(v); } });
  return { symbol: r.meta.symbol, name: r.meta.shortName || r.meta.longName || r.meta.symbol, currency: r.meta.currency || '', t, c, prevClose: r.meta.chartPreviousClose ?? null };
}
export async function chartLive(symbol: string, range: string, interval: string): Promise<Bars> {
  return parseChart(await getJSON<ChartResponse>(`${HOST.yahoo}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`));
}
/** Chart bars. On the website these come from the snapshot (only for symbols the site tracks). */
export async function chart(symbol: string, range: string, interval: string): Promise<Bars> {
  if (!STATIC) return chartLive(symbol, range, interval);
  if (range === 'max') { const b = await snap<Bars>(`chart-${symbol.replace(/[^A-Za-z0-9]/g, '_')}-max.json`); return b; }
  const file = range === '1d' ? SNAP_FILES['1d'] : range === '5y' ? SNAP_FILES['5y'] : SNAP_FILES['1y'];
  const all = await snap<Record<string, Quote>>(file);
  let q = all[symbol];
  if (!q) throw new Error(`${symbol} isn't tracked on the website (run locally for any ticker)`);
  // the website keeps daily bars, so 5D shows the last six daily closes
  if (range === '5d') q = window(q, 6); else if (range === '1mo') q = window(q, 22); else if (range === '6mo') q = window(q, 127);
  return { symbol, name: q.name, currency: q.currency, t: q.t ?? [], c: q.spark, prevClose: q.prev };
}
export const chartAsOf = (range: string) => (STATIC ? snapTime(range === '1d' ? SNAP_FILES['1d'] : range === '5y' ? SNAP_FILES['5y'] : SNAP_FILES['1y']) : undefined);

/** One symbol at a time via the chart endpoint (what works from cloud servers), with backoff on 429. */
export async function chartQuotes(symbols: string[], range: string, interval: string, gapMs = 600): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  let limited = 0, n = 0; // consecutive symbols that stayed rate-limited
  for (const s of symbols) {
    if (limited >= 6) throw new Error(`Yahoo rate-limited this server (${Object.keys(out).length}/${symbols.length} symbols fetched)`);
    for (let attempt = 0; attempt < 3; attempt++) {
      // alternate Yahoo's two API hosts (Node only; the browser goes through the relay)
      const host = NODE ? `https://query${(n++ % 2) + 1}.finance.yahoo.com` : HOST.yahoo;
      try {
        const j = await getJSON<ChartResponse>(`${host}/v8/finance/chart/${encodeURIComponent(s)}?range=${range}&interval=${interval}`, { timeout: 10000 });
        const r = j.chart?.result?.[0];
        if (r) Object.assign(out, parseSpark({ spark: { error: null, result: [{ symbol: s, response: [r] }] } } as SparkResponse, range === '1d', true));
        limited = 0;
        break;
      } catch (e) {
        if (NODE && Object.keys(out).length === 0 && symbols.indexOf(s) < 3) console.log('  yahoo', s, host, String(e));
        if (!/429/.test(String(e))) break;
        if (attempt === 2) limited++;
        await new Promise((res) => setTimeout(res, 8000 * (attempt + 1)));
      }
    }
    await new Promise((res) => setTimeout(res, gapMs));
  }
  return out;
}

// ---- shared intraday quotes: every panel registers the symbols it shows; one source fetches them all ----
const wanted = new Set<string>();
export const QUOTES: SourceDef<Record<string, Quote>> = {
  id: 'yahoo:quotes',
  label: 'Quotes',
  provider: 'Yahoo Finance',
  every: STATIC ? 5 * 60_000 : 60_000,
  asOf: STATIC ? snapTime(SNAP_FILES['1d']) : undefined,
  fetch: () => spark([...wanted]),
};
let pending: ReturnType<typeof setTimeout> | undefined;
function want(symbols: string[]) {
  let added = false;
  for (const s of symbols) if (!wanted.has(s)) { wanted.add(s); added = true; }
  if (added) { clearTimeout(pending); pending = setTimeout(() => void run(QUOTES.id), 120); }
}

export function useQuotes(symbols: string[]) {
  const key = symbols.join(',');
  useEffect(() => want(symbols), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return useSource(QUOTES);
}
