/* Builds the data snapshot for the website (run by .github/workflows/deploy.yml every ~15 minutes).
   Fetches the sources browsers can't reach directly (Yahoo, FRED, SEC, RSS) and writes public/snap/*.json
   as { generated, data }. Company files (SEC financials + Form 4) are refreshed when older than 20 hours.
   Usage: npx vite-node scripts/snapshot.ts [--only=quotes,fred,sec,rss,companies]                          */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sparkLive, chartLive, SNAP_FILES } from '../src/data/yahoo';
import { fredMany, DAILY_IDS, MACRO_IDS, FRED_SINCE } from '../src/data/fred';
import { EDGAR_FORMS, edgarUrl, edgarSnapName, FEEDS } from '../src/data/sources';
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
async function step(name: string, fn: () => Promise<string>) {
  try { const msg = await fn(); report[name] = 'ok · ' + msg; log('✓', name, msg); }
  catch (e) { report[name] = 'failed · ' + (e as Error).message; log('✗', name, (e as Error).message); }
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

  if (want('quotes')) {
    await step('quotes', async () => {
      const [d1, d5, y1, y5] = await Promise.all([
        sparkLive(SYMBOLS, '1d', '5m', true), sparkLive(SYMBOLS, '5d', '30m', true),
        sparkLive(SYMBOLS, '1y', '1d', true), sparkLive(SYMBOLS, '5y', '1wk', true),
      ]);
      if (Object.keys(d1).length < SYMBOLS.length * 0.5) throw new Error(`only ${Object.keys(d1).length}/${SYMBOLS.length} symbols returned`);
      await Promise.all([save(SNAP_FILES['1d'], d1), save(SNAP_FILES['5d'], d5), save(SNAP_FILES['1y'], y1), save(SNAP_FILES['5y'], y5)]);
      return `${Object.keys(d1).length}/${SYMBOLS.length} symbols`;
    });
    await step('gspc-history', async () => { const b = await chartLive('^GSPC', 'max', '1mo'); await save('chart-_GSPC-max.json', b); return `${b.c.length} months`; });
  }

  if (want('fred')) {
    await step('fred', async () => {
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

  if (want('companies')) {
    await step('companies', async () => {
      const maxAge = Number(process.env.COMPANIES_MAX_AGE_H ?? 20) * 3600_000;
      let fresh = 0, kept = 0, failed = 0;
      for (const t of COMPANIES) {
        const file = path.join(OUT, coSnapName(t));
        try {
          const old = JSON.parse(await readFile(file, 'utf8')) as { generated: number };
          if (Date.now() - old.generated < maxAge) { kept++; continue; }
        } catch { /* not cached yet */ }
        try { await save(coSnapName(t), await buildCompany(t)); fresh++; await new Promise((r) => setTimeout(r, 400)); }
        catch (e) { failed++; log('  company', t, (e as Error).message); }
      }
      return `${fresh} refreshed, ${kept} cached, ${failed} failed`;
    });
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
  if (failed && failed === Object.keys(report).length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
