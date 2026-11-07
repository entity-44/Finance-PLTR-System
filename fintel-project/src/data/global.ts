import { getJSON, getText } from '@/lib/http';
import { isoDaysAgo } from '@/lib/format';
import { HOST, NODE, snap, snapTime, STATIC } from '@/lib/env';
import type { SourceDef } from './store';
import type { Series } from './fred';

// Phase 2 sources: the week's economic calendar and daily 10-year government bond yields outside the US.

// ============================ Economic calendar (Forex Factory's public weekly feed, no key, no CORS)
export type Impact = 'High' | 'Medium' | 'Low' | 'Holiday';
export interface EcoEvent { t: number; cur: string; title: string; impact: Impact; forecast: string; previous: string }
const IMPACTS: Impact[] = ['High', 'Medium', 'Low', 'Holiday'];

/** Parse ff_calendar_thisweek.json: [{ title, country (a currency code), date (ISO with offset), impact, forecast, previous }]. */
export function parseFFCalendar(raw: unknown): EcoEvent[] {
  if (!Array.isArray(raw)) throw new Error('calendar feed: unexpected format');
  const out: EcoEvent[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const t = Date.parse(String(r?.date ?? ''));
    const impact = IMPACTS.find((x) => x === r?.impact);
    if (!Number.isFinite(t) || !impact || typeof r.title !== 'string' || typeof r.country !== 'string') continue;
    out.push({ t, cur: r.country, title: r.title.trim(), impact, forecast: String(r.forecast ?? '').trim(), previous: String(r.previous ?? '').trim() });
  }
  return out.sort((a, b) => a.t - b.t);
}
export async function ecoCalendar(): Promise<EcoEvent[]> {
  const ev = parseFFCalendar(await getJSON<unknown>(`${HOST.ff}/ff_calendar_thisweek.json`));
  if (!ev.length) throw new Error('calendar feed is empty');
  return ev;
}
export const ECOCAL: SourceDef<EcoEvent[]> = {
  id: 'ff:calendar', label: 'Economic calendar', provider: 'Forex Factory', every: 30 * 60_000,
  asOf: STATIC ? snapTime('ecocal.json') : undefined,
  fetch: () => (STATIC ? snap<EcoEvent[]>('ecocal.json') : ecoCalendar()),
};

// ============================ Daily 10-year government yields from each issuer's statistics office
export type GovId = 'DE' | 'EA' | 'GB' | 'JP' | 'CA' | 'AU';
export interface GovDef { id: GovId; name: string; what: string; by: string; browser: boolean; fetch: (since: string) => Promise<Series> }

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/** "2026-11-05", "2026/11/5", "05 Nov 2026", "05-Nov-2026" → ISO date, or undefined. */
export function toIso(s: string): string | undefined {
  const t = s.trim().replace(/^"|"$/g, '');
  let m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[ -]([A-Za-z]{3})[ -](\d{4})$/);
  if (m && MON[m[2].toLowerCase()]) return iso(+m[3], MON[m[2].toLowerCase()], +m[1]);
  return undefined;
}
const ok = (v: number) => Number.isFinite(v) && v > -5 && v < 30; // a plausible yield in percent
function keep(out: Series, d: string | undefined, raw: string | undefined, since: string) {
  const v = Number((raw ?? '').trim());
  if (d && d >= since && raw?.trim() && ok(v)) out.push({ d, v });
}
const sorted = (s: Series) => { s.sort((a, b) => a.d.localeCompare(b.d)); if (!s.length) throw new Error('no observations'); return s; };

/** Bundesbank SDMX CSV: metadata rows, then "YYYY-MM-DD,value," ("." = no value). */
export function parseBuba(csv: string, since = '0000'): Series {
  const out: Series = [];
  for (const l of csv.split(/\r?\n/)) { const c = l.split(','); if (/^\d{4}-\d{2}-\d{2}$/.test(c[0])) keep(out, c[0], c[1], since); }
  return sorted(out);
}
/** ECB data API csvdata: header row names TIME_PERIOD and OBS_VALUE. */
export function parseEcb(csv: string, since = '0000'): Series {
  const L = csv.trim().split(/\r?\n/), h = L[0].split(',');
  const tp = h.indexOf('TIME_PERIOD'), ov = h.indexOf('OBS_VALUE');
  if (tp < 0 || ov < 0) throw new Error('ECB: unexpected format');
  const out: Series = [];
  for (const l of L.slice(1)) { const c = l.split(','); keep(out, toIso(c[tp] ?? ''), c[ov], since); }
  return sorted(out);
}
/** Bank of Canada Valet JSON. */
export function parseValet(j: { observations?: Record<string, unknown>[] }, series: string, since = '0000'): Series {
  const out: Series = [];
  for (const o of j.observations ?? []) keep(out, toIso(String(o.d ?? '')), (o[series] as { v?: string } | undefined)?.v, since);
  return sorted(out);
}
/** A table whose header row names the column (BoE "DATE,IUDMNZC", MOF "Date,1Y,…,10Y"); data rows start with a date. */
export function parseTable(csv: string, col: string, since = '0000'): Series {
  const L = csv.split(/\r?\n/).map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
  const hi = L.findIndex((r) => r.includes(col) && toIso(r[0] ?? '') === undefined);
  if (hi < 0) throw new Error(`column ${col} not found`);
  const k = L[hi].indexOf(col), out: Series = [];
  for (const r of L.slice(hi + 1)) keep(out, toIso(r[0] ?? ''), r[k], since);
  return sorted(out);
}
/** RBA statistical tables: metadata rows, one of which is "Series ID,…,FCMYGBAG10D,…"; data rows start with a date. */
export function parseRba(csv: string, id: string, since = '0000'): Series {
  const L = csv.split(/\r?\n/).map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
  const hdr = L.find((r) => r[0] === 'Series ID');
  const k = hdr?.indexOf(id) ?? -1;
  if (k < 0) throw new Error(`RBA: ${id} not found`);
  const out: Series = [];
  for (const r of L) keep(out, toIso(r[0] ?? ''), r[k], since);
  return sorted(out);
}
const boeDate = (isoDate: string) => { const d = new Date(isoDate + 'T00:00:00Z'); return `${String(d.getUTCDate()).padStart(2, '0')}/${Object.keys(MON)[d.getUTCMonth()].replace(/^./, (x) => x.toUpperCase())}/${d.getUTCFullYear()}`; };

export const GOVIES: GovDef[] = [
  { id: 'DE', name: 'Germany', what: '10y Bund (Svensson curve)', by: 'Deutsche Bundesbank', browser: true,
    fetch: async (s) => parseBuba(await getText(`https://api.statistiken.bundesbank.de/rest/data/BBSIS/D.I.ZST.ZI.EUR.S1311.B.A604.R10XX.R.A.A._Z._Z.A?startPeriod=${s}&format=csv&lang=en`), s) },
  { id: 'EA', name: 'Euro area', what: '10y, all euro-area governments', by: 'ECB', browser: true,
    fetch: async (s) => parseEcb(await getText(`https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_C.SV_C_YM.SR_10Y?startPeriod=${s}&format=csvdata`), s) },
  { id: 'GB', name: 'United Kingdom', what: '10y gilt (zero-coupon)', by: 'Bank of England', browser: false,
    fetch: async (s) => parseTable(await getText(`${HOST.boe}/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=${boeDate(s)}&Dateto=now&SeriesCodes=IUDMNZC&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`), 'IUDMNZC', s) },
  { id: 'JP', name: 'Japan', what: '10y JGB', by: 'Ministry of Finance', browser: false,
    fetch: async (s) => {
      // the full history file covers past months; the current-month file has this month's days
      const [all, cur] = await Promise.allSettled([getText(`${HOST.mof}/english/policy/jgbs/reference/interest_rate/historical/jgbcme_all.csv`, { timeout: 30000 }), getText(`${HOST.mof}/english/policy/jgbs/reference/interest_rate/jgbcme.csv`)]);
      const m = new Map<string, number>();
      for (const r of [all, cur]) if (r.status === 'fulfilled') { try { for (const o of parseTable(r.value, '10Y', s)) m.set(o.d, o.v); } catch { /* other file may have it */ } }
      return sorted([...m].map(([d, v]) => ({ d, v })));
    } },
  { id: 'CA', name: 'Canada', what: '10y benchmark bond', by: 'Bank of Canada', browser: true,
    fetch: async (s) => parseValet(await getJSON(`https://www.bankofcanada.ca/valet/observations/BD.CDN.10YR.DQ.YLD/json?start_date=${s}`), 'BD.CDN.10YR.DQ.YLD', s) },
  { id: 'AU', name: 'Australia', what: '10y Commonwealth bond', by: 'Reserve Bank of Australia', browser: false,
    fetch: async (s) => parseRba(await getText(`${HOST.rba}/statistics/tables/csv/f2-data.csv`), 'FCMYGBAG10D', s) },
];
export const GOV_SINCE_DAYS = 400;
export type GovData = Partial<Record<GovId, { series: Series; error?: undefined } | { series?: undefined; error: string }>>;

/** Fetch every issuer; one failing never hides the others. `which` limits the set (the snapshot job fetches all). */
export async function govYields(which: GovDef[] = GOVIES): Promise<GovData> {
  const since = isoDaysAgo(GOV_SINCE_DAYS);
  const res = await Promise.allSettled(which.map((g) => g.fetch(since)));
  const out: GovData = {};
  which.forEach((g, i) => { const r = res[i]; out[g.id] = r.status === 'fulfilled' ? { series: r.value } : { error: (r.reason as Error)?.message ?? 'failed' }; });
  return out;
}
export const GOV_YIELDS: SourceDef<GovData> = {
  id: 'gov:10y', label: 'Government 10y yields', provider: 'Bundesbank · ECB · BoE · MOF · BoC · RBA', every: 60 * 60_000,
  fetch: async () => {
    // On the website, issuers that block browsers come from the snapshot; the rest load live.
    const live = STATIC && !NODE ? GOVIES.filter((g) => g.browser) : GOVIES;
    const [a, b] = await Promise.all([govYields(live), STATIC ? snap<GovData>('yields.json').catch(() => ({} as GovData)) : Promise.resolve({} as GovData)]);
    const out: GovData = { ...b };
    for (const [k, v] of Object.entries(a) as [GovId, GovData[GovId]][]) if (v?.series || !out[k]?.series) out[k] = v;
    if (!Object.values(out).some((x) => x?.series)) throw new Error('no issuer responded');
    return out;
  },
};
