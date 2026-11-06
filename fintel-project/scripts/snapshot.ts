/* Builds the data snapshot for the website (run by .github/workflows/deploy.yml every ~15 minutes).
   Fetches the sources browsers can't reach directly (Yahoo, FRED, SEC, RSS) and writes public/snap/*.json
   as { generated, data }. Company files (SEC financials + Form 4) are refreshed when older than 20 hours.
   Usage: npx vite-node scripts/snapshot.ts [--only=quotes,fred,sec,rss,companies]                          */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chartQuotes, chartLive, SNAP_FILES } from '../src/data/yahoo';
import { fredMany, DAILY_IDS, MACRO_IDS, FRED_SINCE } from '../src/data/fred';
import { EDGAR_FORMS, edgarUrl, edgarSnapName, FEEDS, finnhubEarnings, finnhubIpos, groqBrief, GROQ_MODEL, bisPolicy, imfWeo } from '../src/data/sources';
import { briefPrompt } from '../src/data/brief';
import { buildCompany, buildNetwork, coSnapName, type CompanyData } from '../src/data/company';
import { COMMODITIES, COUNTRIES, DEFAULT_WATCHLIST, FX, HEATMAP, INDICES, SECTORS, TAPE, VOL } from '../src/data/universe';
import { getText } from '../src/lib/http';

const OUT = path.resolve(__dirname, '../public/snap');
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const want = (k: string) => !only.length || only.includes(k);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const report: Record<string, string> = {};

async function save(name: string, data: unknown) {
  const file = path.join(OUT, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ generated: Date.now(), data }));
}
const DAY_MS = Number(process.env.COMPANIES_MAX_AGE_H ?? 20) * 3600_000;
/** True if a snapshot file exists and is younger than the daily refresh age. */
async function fresh(name: string) {
  try { return Date.now() - (JSON.parse(await readFile(path.join(OUT, name), 'utf8')) as { generated: number }).generated < DAY_MS; } catch { return false; }
}
/** Run one step with a hard time limit, so a hanging source can never stall the whole deploy. */
async function step(name: string, fn: () => Promise<string>, limitMs = 4 * 60_000) {
  const t0 = Date.now();
  try {
    const msg = await Promise.race([fn(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`gave up after ${limitMs / 1000}s`)), limitMs))]);
    report[name] = 'ok · ' + msg; log('✓', name, msg, `(${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  } catch (e) { report[name] = 'failed · ' + (e as Error).message; log('✗', name, (e as Error).message, `(${((Date.now() - t0) / 1000).toFixed(0)}s)`); }
}

/** Quick reachability check of each host, printed first so a broken source is obvious in the log. */
async function probe() {
  const targets: [string, string][] = [
    ['yahoo SPY', 'https://query1.finance.yahoo.com/v8/finance/chart/SPY?range=1d&interval=5m'],
    ['yahoo ES=F', 'https://query2.finance.yahoo.com/v8/finance/chart/ES%3DF?range=1d&interval=5m'],
    ['yahoo ^VIX', 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=1d&interval=5m'],
    ['fred csv', 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10&cosd=2026-01-01'],
    ['sec', 'https://www.sec.gov/files/company_tickers.json'],
  ];
  for (const [label, url] of targets) {
    const t0 = Date.now();
    try { const body = await getText(url, { timeout: 15000 }); log('probe', label, 'ok', `${body.length}B`, `${Date.now() - t0}ms`); }
    catch (e) { log('probe', label, 'ERROR', (e as Error).message, `${Date.now() - t0}ms`); }
  }
}

export const SYMBOLS = [...new Set([
  ...TAPE.map((x) => x[0]), ...INDICES.flatMap((r) => r.items.map((x) => x[0])), ...SECTORS.map((x) => x[0]), 'SPY',
  ...VOL.map((x) => x[0]), ...COMMODITIES.flatMap((g) => g.items.map((x) => x[0])), ...FX.map((x) => x[0]),
  ...HEATMAP.flatMap((g) => g.items), ...COUNTRIES.flatMap((c) => [c.index?.[0], c.fx?.[0]]).filter((x): x is string => !!x),
  ...DEFAULT_WATCHLIST, 'ZQ=F',
])];
export const COMPANIES = [...new Set([...HEATMAP.flatMap((g) => g.items), ...DEFAULT_WATCHLIST])].filter((t) => !['SPY', 'QQQ', 'TLT'].includes(t));

async function main() {
  await mkdir(OUT, { recursive: true });
  await probe();

  if (want('quotes')) {
    await step('quotes', async () => {
      const d1 = await chartQuotes(SYMBOLS, '1d', '5m');
      if (Object.keys(d1).length < SYMBOLS.length * 0.5) throw new Error(`only ${Object.keys(d1).length}/${SYMBOLS.length} symbols returned`);
      await save(SNAP_FILES['1d'], d1);
      return `${Object.keys(d1).length}/${SYMBOLS.length} symbols`;
    });
    // Longer histories change slowly: rebuild them once a day (the workflow caches them between runs).
    for (const [file, range, interval] of [[SNAP_FILES['1y'], '1y', '1d'], [SNAP_FILES['5y'], '5y', '1wk']] as const) {
      await step('history ' + range, async () => {
        if (await fresh(file)) return 'cached';
        const q = await chartQuotes(SYMBOLS, range, interval);
        if (Object.keys(q).length < SYMBOLS.length * 0.5) throw new Error(`only ${Object.keys(q).length} symbols`);
        await save(file, q);
        return `${Object.keys(q).length} symbols`;
      });
    }
    await step('gspc-history', async () => {
      if (await fresh('chart-_GSPC-max.json')) return 'cached';
      const b = await chartLive('^GSPC', 'max', '1mo'); await save('chart-_GSPC-max.json', b); return `${b.c.length} months`;
    });
  }

  if (want('fred')) {
    await step('fred', async () => {
      // Without an API key, FRED's public CSV tends to time out from cloud runners: check once, then skip fast.
      if (!process.env.FRED_API_KEY) await getText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10&cosd=2026-01-01', { timeout: 15000 }).catch(() => { throw new Error('FRED unreachable without FRED_API_KEY secret'); });
      const [daily, macro] = await Promise.all([fredMany(DAILY_IDS, FRED_SINCE.daily), fredMany(MACRO_IDS, FRED_SINCE.macro)]);
      const n = Object.keys(daily).length + Object.keys(macro).length;
      if (n < (DAILY_IDS.length + MACRO_IDS.length) * 0.6) throw new Error(`only ${n} series`);
      await save('fred.json', { daily, macro });
      return `${n} series`;
    });
  }

  if (want('sec')) {
    for (const form of EDGAR_FORMS) {
      await step('sec ' + form, async () => { const x = await getText(edgarUrl(form)); if (!x.includes('<entry')) throw new Error('no entries'); await save(edgarSnapName(form), x); return `${(x.match(/<entry>/g) || []).length} filings`; });
    }
  }

  if (want('rss')) {
    await step('rss', async () => {
      const out: Record<string, string> = {};
      for (const f of FEEDS) { try { out[f.key] = await getText(f.url); } catch (e) { log('  feed', f.key, (e as Error).message); } }
      if (!Object.keys(out).length) throw new Error('no feeds');
      await save('rss.json', out);
      return Object.keys(out).join(', ');
    });
  }

  if (want('imf')) {
    await step('imf', async () => { const d = await imfWeo(); await save('imf.json', d); return `${Object.keys(d.data).length} economies · ${d.edition}`; });
  }

  if (want('bis')) {
    await step('bis', async () => { const p = await bisPolicy(); await save('bis.json', p); return `${Object.keys(p).length} central banks`; });
  }

  if (want('finnhub') && process.env.FINNHUB_API_KEY) {
    const k = process.env.FINNHUB_API_KEY;
    await step('earnings', async () => { const e = await finnhubEarnings(k); await save('earnings.json', e); return `${e.upcoming.length} upcoming, ${e.reported.length} reported`; });
    await step('ipos', async () => { const i = await finnhubIpos(k); await save('ipo.json', i); return `${i.length} IPOs`; });
  }

  if (want('brief') && process.env.GROQ_API_KEY) {
    await step('brief', async () => {
      try { const old = JSON.parse(await readFile(path.join(OUT, 'brief.json'), 'utf8')) as { generated: number }; if (Date.now() - old.generated < 55 * 60_000) return 'cached (hourly)'; } catch { /* first one */ }
      const read = async <T>(f: string): Promise<T | undefined> => { try { return (JSON.parse(await readFile(path.join(OUT, f), 'utf8')) as { data: T }).data; } catch { return undefined; } };
      const q = await read<Record<string, import('../src/data/yahoo').Quote>>(SNAP_FILES['1d']);
      if (!q) throw new Error('no quotes to write from');
      const fred = await read<Record<'daily' | 'macro', Record<string, import('../src/data/fred').Series>>>('fred.json');
      const text = await groqBrief(briefPrompt(q, fred?.daily ?? {}, fred?.macro ?? {}), process.env.GROQ_API_KEY);
      await save('brief.json', { text, at: Date.now(), model: GROQ_MODEL });
      return `${text.split(/\s+/).length} words`;
    });
  }

  if (want('companies')) {
    await step('companies', async () => {
      let done = 0, kept = 0, failed = 0;
      for (const t of COMPANIES) {
        const file = path.join(OUT, coSnapName(t));
        try {
          const old = JSON.parse(await readFile(file, 'utf8')) as { generated: number };
          if (Date.now() - old.generated < DAY_MS) { kept++; continue; }
        } catch { /* not cached yet */ }
        try { await save(coSnapName(t), await buildCompany(t)); done++; }
        catch (e) { failed++; log('  company', t, (e as Error).message); }
      }
      if (!done && !kept) throw new Error(`all ${failed} failed`);
      return `${done} refreshed, ${kept} cached, ${failed} failed`;
    }, 10 * 60_000);
  }

  // the network is rebuilt from whatever company files exist
  await step('network', async () => {
    const dir = path.join(OUT, 'co');
    const files = await readdir(dir).catch(() => [] as string[]);
    const cos: CompanyData[] = [];
    for (const f of files) cos.push((JSON.parse(await readFile(path.join(dir, f), 'utf8')) as { data: CompanyData }).data);
    if (!cos.length) throw new Error('no company files');
    const net = buildNetwork(cos);
    await save('network.json', net);
    await save('companies.json', cos.map((c) => ({ ticker: c.ticker, name: c.name, industry: c.industry })));
    return `${net.companies.length} companies, ${net.people.length} people, ${net.people.filter((p) => p.links.length > 1).length} connecting 2+ companies`;
  });

  await save('meta.json', report);
  const failed = Object.values(report).filter((v) => v.startsWith('failed')).length;
  log(`done · ${failed} step(s) failed`);
  // Only fail the job if nothing usable was produced, so one flaky source never blocks the deploy.
  // Exit explicitly: a step that hit its time limit may still have requests in flight.
  process.exit(failed && failed === Object.keys(report).length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
