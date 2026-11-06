import { getJSON, getText } from '@/lib/http';
import { isoDaysAgo } from '@/lib/format';
import { getKey } from '@/lib/keys';
import { HOST, snap, snapTime, STATIC } from '@/lib/env';
import type { SourceDef } from './store';

// ============================ U.S. Treasury auctions (fiscaldata.treasury.gov, CORS, no key)
const FISCAL = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query';
export interface Auction {
  type: string; term: string; date: string; issue: string; cusip: string;
  rate: number | null; rateKind: 'yield' | 'discount' | null; btc: number | null; offering: number | null; reopening: boolean;
}
interface AuctionRow { security_type: string; security_term: string; auction_date: string; issue_date: string; cusip: string; high_yield: string | null; high_discnt_rate: string | null; high_investment_rate: string | null; bid_to_cover_ratio: string | null; offering_amt: string | null; reopening: string | null }
const n = (s: string | null | undefined) => (s == null || s === 'null' || s === '' ? null : Number(s));
export function toAuction(r: AuctionRow): Auction {
  const hy = n(r.high_yield), hd = n(r.high_discnt_rate);
  return {
    type: r.security_type, term: r.security_term, date: r.auction_date, issue: r.issue_date, cusip: r.cusip,
    rate: hy ?? n(r.high_investment_rate) ?? hd, rateKind: hy != null ? 'yield' : (n(r.high_investment_rate) ?? hd) != null ? 'discount' : null,
    btc: n(r.bid_to_cover_ratio), offering: n(r.offering_amt), reopening: r.reopening === 'Yes',
  };
}
const FIELDS = 'security_type,security_term,auction_date,issue_date,cusip,high_yield,high_discnt_rate,high_investment_rate,bid_to_cover_ratio,offering_amt,reopening';
export const AUCTIONS: SourceDef<{ results: Auction[]; upcoming: Auction[] }> = {
  id: 'treasury:auctions', label: 'Treasury auctions', provider: 'U.S. Treasury', every: 60 * 60_000,
  fetch: async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [res, up] = await Promise.all([
      getJSON<{ data: AuctionRow[] }>(`${FISCAL}?fields=${FIELDS}&filter=bid_to_cover_ratio:gt:0&sort=-auction_date&page[size]=14`),
      getJSON<{ data: AuctionRow[] }>(`${FISCAL}?fields=${FIELDS}&filter=auction_date:gte:${today}&sort=auction_date&page[size]=14`),
    ]);
    return { results: res.data.map(toAuction), upcoming: up.data.map(toAuction) };
  },
};

// ============================ CFTC Commitments of Traders (publicreporting.cftc.gov, CORS, no key)
export interface CotMarket { code: string; label: string; group: string; dataset: 'tff' | 'dis' }
export const COT_MARKETS: CotMarket[] = [
  { code: '13874+', label: 'S&P 500', group: 'Equities', dataset: 'tff' },
  { code: '20974+', label: 'Nasdaq-100', group: 'Equities', dataset: 'tff' },
  { code: '1170E1', label: 'VIX', group: 'Equities', dataset: 'tff' },
  { code: '042601', label: 'UST 2Y', group: 'Rates', dataset: 'tff' },
  { code: '043602', label: 'UST 10Y', group: 'Rates', dataset: 'tff' },
  { code: '020601', label: 'UST Bond', group: 'Rates', dataset: 'tff' },
  { code: '098662', label: 'Dollar Index', group: 'FX & crypto', dataset: 'tff' },
  { code: '099741', label: 'Euro', group: 'FX & crypto', dataset: 'tff' },
  { code: '097741', label: 'Yen', group: 'FX & crypto', dataset: 'tff' },
  { code: '096742', label: 'Pound', group: 'FX & crypto', dataset: 'tff' },
  { code: '133741', label: 'Bitcoin', group: 'FX & crypto', dataset: 'tff' },
  { code: '067651', label: 'WTI Crude', group: 'Commodities', dataset: 'dis' },
  { code: '023651', label: 'Natural Gas', group: 'Commodities', dataset: 'dis' },
  { code: '088691', label: 'Gold', group: 'Commodities', dataset: 'dis' },
  { code: '084691', label: 'Silver', group: 'Commodities', dataset: 'dis' },
  { code: '085692', label: 'Copper', group: 'Commodities', dataset: 'dis' },
  { code: '002602', label: 'Corn', group: 'Commodities', dataset: 'dis' },
  { code: '005602', label: 'Soybeans', group: 'Commodities', dataset: 'dis' },
  { code: '001602', label: 'Wheat (SRW)', group: 'Commodities', dataset: 'dis' },
];
export interface CotRow { market: CotMarket; date: string; net: number; change: number; oi: number; netPctOi: number; pctile: number | null; history: number[] }
type Raw = Record<string, string>;
/** Speculative net position: leveraged funds (financial futures) or managed money (commodities). */
export function specNet(r: Raw, ds: 'tff' | 'dis'): number {
  return ds === 'tff'
    ? Number(r.lev_money_positions_long) - Number(r.lev_money_positions_short)
    : Number(r.m_money_positions_long_all) - Number(r.m_money_positions_short_all);
}
export function cotRows(rows: Raw[], ds: 'tff' | 'dis'): CotRow[] {
  const by = new Map<string, Raw[]>();
  for (const r of rows) { const k = r.cftc_contract_market_code; if (!by.has(k)) by.set(k, []); by.get(k)!.push(r); }
  const out: CotRow[] = [];
  for (const m of COT_MARKETS.filter((x) => x.dataset === ds)) {
    const list = (by.get(m.code) || []).sort((a, b) => a.report_date_as_yyyy_mm_dd.localeCompare(b.report_date_as_yyyy_mm_dd));
    if (!list.length) continue;
    const hist = list.map((r) => specNet(r, ds));
    const cur = list[list.length - 1], net = hist[hist.length - 1], prev = hist.length > 1 ? hist[hist.length - 2] : net;
    const oi = Number(cur.open_interest_all);
    const below = hist.filter((v) => v <= net).length;
    out.push({ market: m, date: cur.report_date_as_yyyy_mm_dd.slice(0, 10), net, change: net - prev, oi, netPctOi: oi ? (net / oi) * 100 : 0, pctile: hist.length >= 20 ? Math.round(((below - 1) / (hist.length - 1)) * 100) : null, history: hist });
  }
  return out;
}
async function cotDataset(ds: 'tff' | 'dis'): Promise<CotRow[]> {
  const id = ds === 'tff' ? 'gpe5-46if' : '72hh-3qpy';
  const codes = COT_MARKETS.filter((m) => m.dataset === ds).map((m) => `'${m.code}'`).join(',');
  const cols = ds === 'tff' ? 'lev_money_positions_long,lev_money_positions_short' : 'm_money_positions_long_all,m_money_positions_short_all';
  const where = encodeURIComponent(`cftc_contract_market_code in(${codes}) AND report_date_as_yyyy_mm_dd >= '${isoDaysAgo(372)}'`);
  const rows = await getJSON<Raw[]>(`https://publicreporting.cftc.gov/resource/${id}.json?$select=cftc_contract_market_code,report_date_as_yyyy_mm_dd,open_interest_all,${cols}&$where=${where}&$limit=5000`);
  return cotRows(rows, ds);
}
export const COT: SourceDef<CotRow[]> = {
  id: 'cftc:cot', label: 'Commitments of Traders', provider: 'CFTC', every: 6 * 60 * 60_000,
  fetch: async () => { const [a, b] = await Promise.all([cotDataset('tff'), cotDataset('dis')]); return [...a, ...b]; },
};

// ============================ Crypto (CoinGecko, alternative.me, mempool.space; CORS, no key)
export interface Coin { id: string; symbol: string; name: string; price: number; mcap: number; vol: number; chg24: number | null; chg7d: number | null; spark: number[] }
export interface CryptoData { coins: Coin[]; totalMcap: number | null; mcapChg: number | null; btcDom: number | null; ethDom: number | null; fng: { value: number; label: string; history: number[] } | null; fees: { fast: number; hour: number; eco: number } | null; height: number | null }
export const CRYPTO: SourceDef<CryptoData> = {
  id: 'crypto', label: 'Crypto markets', provider: 'CoinGecko · mempool.space', every: 2 * 60_000,
  fetch: async () => {
    const [mk, gl, fg, fees, tip] = await Promise.allSettled([
      getJSON<any[]>('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=12&sparkline=true&price_change_percentage=24h,7d'),
      getJSON<{ data: any }>('https://api.coingecko.com/api/v3/global'),
      getJSON<{ data: { value: string; value_classification: string }[] }>('https://api.alternative.me/fng/?limit=30'),
      getJSON<{ fastestFee: number; hourFee: number; economyFee: number }>('https://mempool.space/api/v1/fees/recommended'),
      getText('https://mempool.space/api/blocks/tip/height'),
    ]);
    if (mk.status === 'rejected') throw mk.reason;
    const g = gl.status === 'fulfilled' ? gl.value.data : null;
    return {
      coins: mk.value.map((c) => ({ id: c.id, symbol: String(c.symbol).toUpperCase(), name: c.name, price: c.current_price, mcap: c.market_cap, vol: c.total_volume, chg24: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? null, chg7d: c.price_change_percentage_7d_in_currency ?? null, spark: c.sparkline_in_7d?.price ?? [] })),
      totalMcap: g?.total_market_cap?.usd ?? null, mcapChg: g?.market_cap_change_percentage_24h_usd ?? null,
      btcDom: g?.market_cap_percentage?.btc ?? null, ethDom: g?.market_cap_percentage?.eth ?? null,
      fng: fg.status === 'fulfilled' && fg.value.data?.length ? { value: Number(fg.value.data[0].value), label: fg.value.data[0].value_classification, history: fg.value.data.map((d) => Number(d.value)).reverse() } : null,
      fees: fees.status === 'fulfilled' ? { fast: fees.value.fastestFee, hour: fees.value.hourFee, eco: fees.value.economyFee } : null,
      height: tip.status === 'fulfilled' ? Number(tip.value) || null : null,
    };
  },
};

// ============================ World Bank indicators (CORS, no key), most recent non-empty value per country
export const WB_INDICATORS: { id: string; label: string; unit: string }[] = [
  { id: 'NY.GDP.MKTP.KD.ZG', label: 'Real GDP growth', unit: '%' },
  { id: 'FP.CPI.TOTL.ZG', label: 'Inflation (CPI)', unit: '%' },
  { id: 'SL.UEM.TOTL.ZS', label: 'Unemployment', unit: '%' },
  { id: 'GC.DOD.TOTL.GD.ZS', label: 'Central gov. debt', unit: '% GDP' },
  { id: 'BN.CAB.XOKA.GD.ZS', label: 'Current account', unit: '% GDP' },
  { id: 'NY.GDP.MKTP.CD', label: 'GDP', unit: 'USD' },
];
export type WbData = Record<string, Record<string, { v: number; year: string }>>;
export function worldBankSource(iso3: string[]): SourceDef<WbData> {
  return {
    id: 'worldbank', label: 'Country fundamentals', provider: 'World Bank', every: 24 * 60 * 60_000,
    fetch: async () => {
      const out: WbData = {};
      const res = await Promise.allSettled(WB_INDICATORS.map((ind) =>
        getJSON<[unknown, { countryiso3code: string; date: string; value: number | null }[] | null]>(`https://api.worldbank.org/v2/country/${iso3.join(';')}/indicator/${ind.id}?format=json&mrnev=1&per_page=200`)));
      res.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        for (const row of r.value[1] || []) {
          if (row.value == null) continue;
          (out[row.countryiso3code] ||= {})[WB_INDICATORS[i].id] = { v: row.value, year: row.date };
        }
      });
      if (!Object.keys(out).length) throw new Error('no data returned');
      return out;
    },
  };
}

// ============================ SEC EDGAR live filings feed (via /px/sec)
export interface Filing { form: string; company: string; cik: string; when: string; link: string; items: string }
export function parseEdgarAtom(xml: string): Filing[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return [...doc.querySelectorAll('entry')].map((e) => {
    const title = e.querySelector('title')?.textContent || '';
    const m = title.match(/^(.+?) - (.+?) \((\d{10})\)/);
    const summary = (e.querySelector('summary')?.textContent || '').replace(/<[^>]+>/g, ' ');
    const items = (summary.match(/Item \d+\.\d+:?[^I]*/g) || []).map((s) => s.trim()).join(' · ');
    return { form: m?.[1] || e.querySelector('category')?.getAttribute('term') || '', company: m?.[2] || title, cik: m?.[3] || '', when: e.querySelector('updated')?.textContent || '', link: e.querySelector('link')?.getAttribute('href') || '', items };
  });
}
export const EDGAR_FORMS = ['8-K', '4', 'S-1', 'SCHEDULE 13D'];
export const edgarUrl = (form: string) => `${HOST.sec}/cgi-bin/browse-edgar?action=getcurrent&type=${encodeURIComponent(form)}&company=&dateb=&owner=include&start=0&count=40&output=atom`;
export const edgarSnapName = (form: string) => `sec-${form.replace(/\W+/g, '_')}.json`;
export function edgarSource(form: string): SourceDef<Filing[]> {
  return {
    id: 'sec:' + form, label: `SEC filings · ${form}`, provider: 'SEC EDGAR', every: 5 * 60_000,
    asOf: STATIC ? snapTime(edgarSnapName(form)) : undefined,
    fetch: async () => parseEdgarAtom(STATIC ? await snap<string>(edgarSnapName(form)) : await getText(edgarUrl(form))),
  };
}

// ============================ News (RSS through the relay)
export interface Headline { title: string; link: string; when: number; source: string }
export const FEEDS: { source: string; key: string; url: string }[] = [
  { source: 'CNBC', key: 'cnbc', url: `${HOST.cnbc}/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114` },
  { source: 'MarketWatch', key: 'mw', url: `${HOST.mw}/public/rss/mw_topstories` },
  { source: 'Federal Reserve', key: 'fed', url: `${HOST.fed}/feeds/press_all.xml` },
  { source: 'SEC', key: 'sec', url: `${HOST.sec}/news/pressreleases.rss` },
];
export function parseRss(xml: string, source: string): Headline[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return [...doc.querySelectorAll('item, entry')].map((it) => {
    const link = it.querySelector('link');
    return {
      title: (it.querySelector('title')?.textContent || '').trim(),
      link: (link?.textContent || link?.getAttribute('href') || '').trim(),
      when: Date.parse(it.querySelector('pubDate, published, updated')?.textContent || '') || 0,
      source,
    };
  }).filter((h) => h.title);
}
export const NEWS: SourceDef<Headline[]> = {
  id: 'news', label: 'Headlines', provider: 'CNBC · MarketWatch · Fed · SEC', every: 5 * 60_000,
  asOf: STATIC ? snapTime('rss.json') : undefined,
  fetch: async () => {
    const xml: Record<string, string> = STATIC ? await snap<Record<string, string>>('rss.json') : {};
    const res = await Promise.allSettled(FEEDS.map(async (f) => {
      if (STATIC && !xml[f.key]) throw new Error(`${f.source} feed missing from snapshot`);
      return parseRss(STATIC ? xml[f.key] : await getText(f.url), f.source);
    }));
    const ok = res.filter((r): r is PromiseFulfilledResult<Headline[]> => r.status === 'fulfilled');
    if (!ok.length) throw (res[0] as PromiseRejectedResult).reason;
    const seen = new Set<string>();
    return ok.flatMap((r) => r.value).sort((a, b) => b.when - a.when).filter((h) => { const k = h.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 80);
  },
};

// Headline tone: a transparent word-count score, not a model. +1 for each "positive" word, -1 for each "negative".
const POS = ['surge', 'surges', 'rally', 'rallies', 'gain', 'gains', 'jump', 'jumps', 'beat', 'beats', 'record', 'rise', 'rises', 'soar', 'soars', 'upgrade', 'strong', 'growth', 'boost', 'rebound', 'cools', 'eases', 'optimism', 'tops', 'climbs', 'higher'];
const NEG = ['plunge', 'plunges', 'fall', 'falls', 'drop', 'drops', 'slump', 'slumps', 'miss', 'misses', 'cut', 'cuts', 'fear', 'fears', 'recession', 'crash', 'tumble', 'tumbles', 'downgrade', 'weak', 'loss', 'losses', 'selloff', 'sell-off', 'warns', 'risk', 'slides', 'lower', 'tariff', 'tariffs', 'layoffs', 'default', 'crisis'];
export function tone(title: string): number {
  const w = title.toLowerCase().match(/[a-z-]+/g) || [];
  let s = 0;
  for (const x of w) { if (POS.includes(x)) s++; else if (NEG.includes(x)) s--; }
  return Math.max(-1, Math.min(1, s));
}

// ============================ Finnhub (optional key; CORS)
const FH = 'https://finnhub.io/api/v1';
export interface EarningsEvent { symbol: string; date: string; hour: string; epsEst: number | null; epsAct: number | null; revEst: number | null; revAct: number | null }
export interface IpoEvent { symbol: string; name: string; date: string; exchange: string; price: string; shares: number | null; status: string }
export async function finnhubEarnings(key: string): Promise<{ upcoming: EarningsEvent[]; reported: EarningsEvent[] }> {
  const from = isoDaysAgo(7), to = isoDaysAgo(-7);
  const j = await getJSON<{ earningsCalendar: any[] }>(`${FH}/calendar/earnings?from=${from}&to=${to}&token=${key}`);
  const all: EarningsEvent[] = (j.earningsCalendar || []).map((e) => ({ symbol: e.symbol, date: e.date, hour: e.hour, epsEst: e.epsEstimate ?? null, epsAct: e.epsActual ?? null, revEst: e.revenueEstimate ?? null, revAct: e.revenueActual ?? null }));
  const today = new Date().toISOString().slice(0, 10);
  return {
    upcoming: all.filter((e) => e.date >= today && e.epsAct == null).sort((a, b) => a.date.localeCompare(b.date) || (b.revEst ?? 0) - (a.revEst ?? 0)),
    reported: all.filter((e) => e.epsAct != null && e.epsEst != null).sort((a, b) => b.date.localeCompare(a.date)),
  };
}
export async function finnhubIpos(key: string): Promise<IpoEvent[]> {
  const j = await getJSON<{ ipoCalendar: any[] }>(`${FH}/calendar/ipo?from=${isoDaysAgo(14)}&to=${isoDaysAgo(-30)}&token=${key}`);
  return (j.ipoCalendar || []).map((e) => ({ symbol: e.symbol || '', name: e.name, date: e.date, exchange: e.exchange || '', price: e.price || '', shares: e.numberOfShares ?? null, status: e.status || '' })).sort((a, b) => b.date.localeCompare(a.date));
}
/** On the website the GitHub job publishes the calendars (its key stays secret); a visitor's own key is the fallback. */
async function viaSiteOrKey<T>(file: string, live: (k: string) => Promise<T>): Promise<T> {
  if (STATIC) {
    try { return await snap<T>(file); } catch { /* not published: fall through to the visitor's key */ }
  }
  const k = getKey('finnhub');
  if (!k) throw new Error('Add a free Finnhub key in Settings');
  return live(k);
}
export const EARNINGS: SourceDef<{ upcoming: EarningsEvent[]; reported: EarningsEvent[] }> = {
  id: 'finnhub:earnings', label: 'Earnings calendar', provider: 'Finnhub', every: 60 * 60_000, requires: STATIC ? undefined : 'finnhub',
  asOf: STATIC ? snapTime('earnings.json') : undefined,
  fetch: () => viaSiteOrKey('earnings.json', finnhubEarnings),
};
export const IPOS: SourceDef<IpoEvent[]> = {
  id: 'finnhub:ipo', label: 'IPO calendar', provider: 'Finnhub', every: 6 * 60 * 60_000, requires: STATIC ? undefined : 'finnhub',
  asOf: STATIC ? snapTime('ipo.json') : undefined,
  fetch: () => viaSiteOrKey('ipo.json', finnhubIpos),
};

// ============================ Groq (optional key) for the written brief
export interface PublishedBrief { text: string; at: number; model: string }
export const BRIEF: SourceDef<PublishedBrief> = {
  id: 'brief', label: 'Morning brief', provider: 'Groq · gpt-oss-120b', every: 15 * 60_000,
  asOf: snapTime('brief.json'),
  fetch: () => snap<PublishedBrief>('brief.json'),
};
// Groq retired llama-3.3-70b-versatile on 2026-08-16; gpt-oss-120b is their recommended replacement.
export const GROQ_MODEL = 'openai/gpt-oss-120b';
export async function groqBrief(prompt: string, key = getKey('groq')): Promise<string> {
  if (!key) throw new Error('Add a Groq key in Settings');
  const res = await getJSON<{ choices: { message: { content: string } }[] }>('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', timeout: 45000,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL, temperature: 0.2, max_tokens: 2000, reasoning_effort: 'low', // reasoning tokens count toward max_tokens
      messages: [
        { role: 'system', content: 'You are a sell-side strategist writing a concise morning market brief. Use ONLY the numbers in the data provided; never invent figures, events or causes. If something is not in the data, do not mention it. Plain text, 5 short sections with headers: Overview, Equities, Rates & Fed, Commodities & FX, What to watch. Under 260 words.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  return res.choices?.[0]?.message?.content?.trim() || 'No text returned.';
}
