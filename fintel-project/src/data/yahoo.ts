import { useEffect } from 'react';
import { chunk, getJSON, pool } from '@/lib/http';
import { run, useSource, type SourceDef } from './store';

// Yahoo Finance's public chart endpoints (no key). Reached through the dev server relay (/px/yahoo).

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  prev: number | null;       // previous close
  change: number | null;
  changePct: number | null;
  time: number;              // last trade, ms
  currency: string;
  spark: number[];           // intraday closes
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

export function parseSpark(json: SparkResponse, daily = true): Record<string, Quote> {
  const out: Record<string, Quote> = {};
  for (const r of json.spark?.result ?? []) {
    const resp = r.response?.[0];
    const m = resp?.meta;
    if (!m || typeof m.regularMarketPrice !== 'number') continue;
    const closes = (resp.indicators?.quote?.[0]?.close ?? []).filter((v): v is number => typeof v === 'number');
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
      dayHigh: m.regularMarketDayHigh, dayLow: m.regularMarketDayLow,
      yearHigh: m.fiftyTwoWeekHigh, yearLow: m.fiftyTwoWeekLow,
      exchange: m.fullExchangeName,
    };
  }
  return out;
}

export async function spark(symbols: string[], range = '1d', interval = '5m'): Promise<Record<string, Quote>> {
  const groups = chunk([...new Set(symbols)], 20);
  const parts = await pool(groups, 3, (g) =>
    getJSON<SparkResponse>(`/px/yahoo/v7/finance/spark?symbols=${g.map(encodeURIComponent).join(',')}&range=${range}&interval=${interval}`)
      .then((j) => parseSpark(j, range === '1d')));
  return Object.assign({}, ...parts.filter(Boolean));
}

export interface Bars { symbol: string; name: string; currency: string; t: number[]; c: number[]; prevClose: number | null }
interface ChartResponse {
  chart: { result: { meta: SparkMeta; timestamp?: number[]; indicators: { quote: { close: (number | null)[] }[]; adjclose?: { adjclose: (number | null)[] }[] } }[] | null; error: { description?: string } | null };
}
export function parseChart(j: ChartResponse): Bars {
  const r = j.chart?.result?.[0];
  if (!r) throw new Error(j.chart?.error?.description || 'no data for this symbol');
  const ts = r.timestamp ?? [], cs = r.indicators.quote[0]?.close ?? [];
  const t: number[] = [], c: number[] = [];
  ts.forEach((x, i) => { const v = cs[i]; if (typeof v === 'number') { t.push(x * 1000); c.push(v); } });
  return { symbol: r.meta.symbol, name: r.meta.shortName || r.meta.longName || r.meta.symbol, currency: r.meta.currency || '', t, c, prevClose: r.meta.chartPreviousClose ?? null };
}
export async function chart(symbol: string, range: string, interval: string): Promise<Bars> {
  return parseChart(await getJSON<ChartResponse>(`/px/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`));
}

// ---- shared intraday quotes: every panel registers the symbols it shows; one source fetches them all ----
const wanted = new Set<string>();
export const QUOTES: SourceDef<Record<string, Quote>> = {
  id: 'yahoo:quotes',
  label: 'Quotes',
  provider: 'Yahoo Finance',
  every: 60_000,
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
