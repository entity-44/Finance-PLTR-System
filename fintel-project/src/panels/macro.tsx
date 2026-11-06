import { useState } from 'react';
import { atOrBefore, diffSeries, fredSource, last, pctChangeSeries, yoySeries, type Series } from '@/data/fred';
import { AUCTIONS } from '@/data/sources';
import { useSource } from '@/data/store';
import { useQuotes } from '@/data/yahoo';
import { FOMC_2026 } from '@/data/universe';
import { big, bp, dateLabel, isNum, isoDaysAgo, monthLabel, num, signed } from '@/lib/format';
import { Chg, Panel, Spark, Tabs } from '@/ui/kit';
import { CurveChart } from '@/ui/charts';
import { T } from '@/ui/theme';

const CURVE: [string, string][] = [['DGS1MO', '1M'], ['DGS3MO', '3M'], ['DGS6MO', '6M'], ['DGS1', '1Y'], ['DGS2', '2Y'], ['DGS3', '3Y'], ['DGS5', '5Y'], ['DGS7', '7Y'], ['DGS10', '10Y'], ['DGS20', '20Y'], ['DGS30', '30Y']];
const DAILY_IDS = [...CURVE.map((c) => c[0]), 'DFEDTARU', 'DFEDTARL', 'EFFR', 'SOFR', 'ECBDFR', 'IUDSOIA', 'T10Y2Y', 'T10Y3M', 'T10YIE', 'DFII10', 'BAMLH0A0HYM2', 'BAMLC0A0CM', 'NFCI', 'STLFSI4', 'WALCL', 'RRPONTSYD', 'WTREGEN', 'MORTGAGE30US', 'DTWEXBGS'];
const MACRO_IDS = ['CPIAUCSL', 'CPILFESL', 'PCEPILFE', 'UNRATE', 'PAYEMS', 'ICSA', 'A191RL1Q225SBEA', 'RSAFS', 'INDPRO', 'HOUST', 'UMCSENT', 'M2SL'];
export const FRED_DAILY = fredSource('fred:daily', 'Rates, credit & liquidity', DAILY_IDS, 400);
export const FRED_MACRO = fredSource('fred:macro', 'Economic data', MACRO_IDS, 1150, 60 * 60_000);

const spk = (s: Series | undefined, n: number) => (s ?? []).slice(-n).map((o) => o.v);

// ---------------------------------------------------------------- yield curve
export function YieldCurve() {
  const f = useSource(FRED_DAILY);
  const d = f.data;
  const lastDate = d ? CURVE.map(([id]) => last(d[id])?.d).filter(Boolean).sort().pop() : undefined;
  const at = (iso?: string) => CURVE.map(([id]) => (iso ? atOrBefore(d?.[id], iso)?.v ?? null : null));
  const now = at(lastDate), m1 = at(lastDate && isoDaysAgo(30, new Date(lastDate))), y1 = at(lastDate && isoDaysAgo(365, new Date(lastDate)));
  const v = (id: string) => last(d?.[id])?.v;
  return (
    <Panel id="p-curve" title="US Treasury curve" src={f} span="c4" note={`Constant-maturity yields as of ${dateLabel(lastDate)} (FRED publishes with a one-day lag).`}>
      <div className="kpis">
        <div className="kpi"><span>2s10s</span><b className={(v('T10Y2Y') ?? 0) < 0 ? 'down' : ''}>{bp(v('T10Y2Y'))}</b><small>{(v('T10Y2Y') ?? 0) < 0 ? 'inverted' : 'positive'}</small></div>
        <div className="kpi"><span>3m10y</span><b className={(v('T10Y3M') ?? 0) < 0 ? 'down' : ''}>{bp(v('T10Y3M'))}</b></div>
        <div className="kpi"><span>10Y real</span><b>{isNum(v('DFII10')) ? num(v('DFII10')) + '%' : '—'}</b><small>TIPS</small></div>
        <div className="kpi"><span>10Y breakeven</span><b>{isNum(v('T10YIE')) ? num(v('T10YIE')) + '%' : '—'}</b></div>
      </div>
      <CurveChart labels={CURVE.map((c) => c[1])} series={[
        { name: 'Latest', color: T.accent, values: now },
        { name: '1 month ago', color: T.dim, values: m1, dash: '4 3' },
        { name: '1 year ago', color: T.accent2, values: y1, dash: '2 3' },
      ]} />
      <div className="legend"><span><i style={{ background: T.accent }} />Latest</span><span><i style={{ background: T.dim }} />1 month ago</span><span><i style={{ background: T.accent2 }} />1 year ago</span></div>
      <table className="t" style={{ marginTop: 8 }}>
        <thead><tr><th>Tenor</th>{CURVE.filter((_, i) => i % 2 === 0 || i === CURVE.length - 1).map((c) => <th key={c[0]}>{c[1]}</th>)}</tr></thead>
        <tbody>
          <tr><td>Yield</td>{CURVE.map((c, i) => (i % 2 === 0 || i === CURVE.length - 1) && <td key={c[0]}>{isNum(now[i]) ? now[i]!.toFixed(2) : '—'}</td>)}</tr>
          <tr><td>1M chg</td>{CURVE.map((c, i) => (i % 2 === 0 || i === CURVE.length - 1) && <td key={c[0]}><span className={isNum(now[i]) && isNum(m1[i]) ? (now[i]! > m1[i]! ? 'up' : now[i]! < m1[i]! ? 'down' : 'flat') : 'flat'}>{isNum(now[i]) && isNum(m1[i]) ? bp(now[i]! - m1[i]!) : '—'}</span></td>)}</tr>
        </tbody>
      </table>
    </Panel>
  );
}

// ---------------------------------------------------------------- central banks & liquidity
export function CentralBanks() {
  const f = useSource(FRED_DAILY);
  const zq = useQuotes(['ZQ=F']);
  const d = f.data;
  const lo = last(d?.DFEDTARL), hi = last(d?.DFEDTARU), effr = last(d?.EFFR);
  const today = new Date().toISOString().slice(0, 10);
  const next = FOMC_2026.find((x) => x >= today);
  const days = next ? Math.ceil((Date.parse(next) - Date.parse(today)) / 864e5) : null;
  const implied = zq.data?.['ZQ=F'] ? 100 - zq.data['ZQ=F'].price : null;
  // Net liquidity = Fed balance sheet − Treasury General Account − overnight reverse repo (all in $ millions; RRP is in $ billions).
  const net = (iso?: string) => {
    const w = iso ? atOrBefore(d?.WALCL, iso) : last(d?.WALCL), t = iso ? atOrBefore(d?.WTREGEN, iso) : last(d?.WTREGEN), r = iso ? atOrBefore(d?.RRPONTSYD, iso) : last(d?.RRPONTSYD);
    return w && t && r ? w.v - t.v - r.v * 1000 : null;
  };
  const netNow = net(), net3m = net(isoDaysAgo(91));
  const netSeries = (d?.WALCL ?? []).slice(-52).map((o) => { const t = atOrBefore(d?.WTREGEN, o.d), r = atOrBefore(d?.RRPONTSYD, o.d); return t && r ? o.v - t.v - r.v * 1000 : null; }).filter(isNum);
  const rows: [string, string, Series | undefined, string?][] = [
    ['Fed funds (effective)', 'EFFR', d?.EFFR], ['SOFR', 'SOFR', d?.SOFR], ['ECB deposit rate', 'ECBDFR', d?.ECBDFR], ['SONIA (BoE)', 'IUDSOIA', d?.IUDSOIA], ['30Y mortgage', 'MORTGAGE30US', d?.MORTGAGE30US],
  ];
  return (
    <Panel id="p-cb" title="Fed, central banks & liquidity" src={[f, zq]} span="c4" note="Futures-implied rate = 100 − front-month 30-day fed funds future (ZQ). Net liquidity = Fed balance sheet − TGA − reverse repo.">
      <div className="kpis">
        <div className="kpi"><span>Fed target range</span><b>{lo && hi ? `${lo.v.toFixed(2)}–${hi.v.toFixed(2)}%` : '—'}</b><small>{hi ? dateLabel(hi.d) : ''}</small></div>
        <div className="kpi"><span>Next FOMC</span><b>{next ? dateLabel(next, false) : '—'}</b><small>{days != null ? `in ${days} day${days === 1 ? '' : 's'}` : 'schedule not yet published'}</small></div>
        <div className="kpi"><span>Futures-implied</span><b>{isNum(implied) ? implied.toFixed(3) + '%' : '—'}</b><small>{isNum(implied) && effr ? `${bp(implied - effr.v)} vs EFFR` : 'front month'}</small></div>
      </div>
      <table className="t">
        <thead><tr><th>Rate</th><th>Latest</th><th>3M chg</th><th>1Y</th></tr></thead>
        <tbody>
          {rows.map(([label, id, s]) => {
            const l = last(s), p = s && l ? atOrBefore(s, isoDaysAgo(91, new Date(l.d))) : undefined;
            return <tr key={id}><td>{label}</td><td>{l ? l.v.toFixed(2) + '%' : '—'}</td><td>{l && p ? <span className={l.v > p.v ? 'up' : l.v < p.v ? 'down' : 'flat'}>{bp(l.v - p.v)}</span> : '—'}</td><td><Spark data={spk(s, 260)} w={64} h={16} color={T.accent} fill={false} /></td></tr>;
          })}
          <tr className="grp"><td colSpan={4}>Liquidity ($)</td></tr>
          <tr><td>Fed balance sheet</td><td>{big((last(d?.WALCL)?.v ?? NaN) * 1e6)}</td><td>{isNum(last(d?.WALCL)?.v) && atOrBefore(d?.WALCL, isoDaysAgo(91)) ? big((last(d!.WALCL)!.v - atOrBefore(d!.WALCL, isoDaysAgo(91))!.v) * 1e6) : '—'}</td><td><Spark data={spk(d?.WALCL, 52)} w={64} h={16} color={T.accent} fill={false} /></td></tr>
          <tr><td>Treasury General Acct</td><td>{big((last(d?.WTREGEN)?.v ?? NaN) * 1e6)}</td><td /><td><Spark data={spk(d?.WTREGEN, 52)} w={64} h={16} color={T.dim} fill={false} /></td></tr>
          <tr><td>Reverse repo</td><td>{big((last(d?.RRPONTSYD)?.v ?? NaN) * 1e9)}</td><td /><td><Spark data={spk(d?.RRPONTSYD, 260)} w={64} h={16} color={T.dim} fill={false} /></td></tr>
          <tr><td><b>Net liquidity</b></td><td><b>{big(isNum(netNow) ? netNow * 1e6 : null)}</b></td><td>{isNum(netNow) && isNum(net3m) ? <span className={netNow > net3m ? 'up' : 'down'}>{signed((netNow - net3m) / 1e6, 2)}T</span> : '—'}</td><td><Spark data={netSeries} w={64} h={16} /></td></tr>
        </tbody>
      </table>
    </Panel>
  );
}

// ---------------------------------------------------------------- economic data
interface MacroRow { label: string; value: string; prior: string; when: string; trend: number[]; good?: 'up' | 'down'; delta: number | null }
function macroRows(d: Record<string, Series> | undefined): MacroRow[] {
  if (!d) return [];
  const rows: MacroRow[] = [];
  const add = (label: string, s: Series, fmt: (v: number) => string, good?: 'up' | 'down', mon = true) => {
    const a = s[s.length - 1], b = s[s.length - 2];
    if (!a) return;
    rows.push({ label, value: fmt(a.v), prior: b ? fmt(b.v) : '—', when: mon ? monthLabel(a.d) : dateLabel(a.d), trend: s.slice(-24).map((o) => o.v), good, delta: b ? a.v - b.v : null });
  };
  const pctf = (v: number) => v.toFixed(1) + '%';
  add('CPI inflation, YoY', yoySeries(d.CPIAUCSL, 26), pctf, 'down');
  add('Core CPI, YoY', yoySeries(d.CPILFESL, 26), pctf, 'down');
  add('Core PCE, YoY (Fed target 2%)', yoySeries(d.PCEPILFE, 26), pctf, 'down');
  if (d.UNRATE) add('Unemployment rate', d.UNRATE, pctf, 'down');
  add('Payrolls, monthly change', diffSeries(d.PAYEMS), (v) => signed(v, 0) + 'K', 'up');
  if (d.ICSA) add('Initial jobless claims', d.ICSA, (v) => (v / 1000).toFixed(0) + 'K', 'down', false);
  if (d.A191RL1Q225SBEA) rows.push((() => { const s = d.A191RL1Q225SBEA, a = s[s.length - 1], b = s[s.length - 2]; const q = (iso: string) => `Q${Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1} ${iso.slice(0, 4)}`; return { label: 'Real GDP, q/q annualised', value: pctf(a.v), prior: b ? pctf(b.v) : '—', when: q(a.d), trend: s.slice(-12).map((o) => o.v), good: 'up' as const, delta: b ? a.v - b.v : null }; })());
  add('Retail sales, m/m', pctChangeSeries(d.RSAFS), (v) => signed(v, 1) + '%', 'up');
  add('Industrial production, YoY', yoySeries(d.INDPRO, 26), pctf, 'up');
  if (d.HOUST) add('Housing starts (annual rate)', d.HOUST, (v) => (v / 1000).toFixed(2) + 'M', 'up');
  if (d.UMCSENT) add('Consumer sentiment (UMich)', d.UMCSENT, (v) => v.toFixed(1), 'up');
  add('M2 money supply, YoY', yoySeries(d.M2SL, 26), pctf);
  return rows;
}
export function Economy() {
  const f = useSource(FRED_MACRO);
  const rows = macroRows(f.data);
  return (
    <Panel id="p-eco" title="US economy" src={f} span="c6" note="Latest releases from FRED. Months with no release (e.g. delayed by a shutdown) are skipped, not filled.">
      <table className="t">
        <thead><tr><th>Indicator</th><th>Latest</th><th>Prior</th><th>Period</th><th>2-year trend</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const better = r.delta == null || r.delta === 0 || !r.good ? 'flat' : (r.delta > 0) === (r.good === 'up') ? 'up' : 'down';
            return <tr key={r.label}><td>{r.label}</td><td><b className={better}>{r.value}</b></td><td className="dim">{r.prior}</td><td className="dim">{r.when}</td><td><Spark data={r.trend} w={90} h={18} color={T.accent} /></td></tr>;
          })}
        </tbody>
      </table>
    </Panel>
  );
}

// ---------------------------------------------------------------- credit & financial conditions
export function Credit() {
  const f = useSource(FRED_DAILY);
  const d = f.data;
  const items: [string, string, string, boolean][] = [
    ['High-yield spread', 'BAMLH0A0HYM2', 'ICE BofA US HY OAS', true], ['Investment-grade spread', 'BAMLC0A0CM', 'ICE BofA US corporate OAS', true],
    ['Chicago Fed NFCI', 'NFCI', 'below 0 = looser than average', true], ['St. Louis stress index', 'STLFSI4', 'below 0 = less stress than average', true],
    ['Broad trade-weighted dollar', 'DTWEXBGS', 'index', false],
  ];
  return (
    <Panel id="p-credit" title="Credit & financial conditions" src={f} span="c4" note="Spreads in percentage points over Treasuries. Colours: tighter/looser = green.">
      <table className="t">
        <thead><tr><th>Measure</th><th>Latest</th><th>3M</th><th>1Y</th></tr></thead>
        <tbody>
          {items.map(([label, id, what, invert]) => {
            const s = d?.[id], l = last(s), p = s && l ? atOrBefore(s, isoDaysAgo(91, new Date(l.d))) : undefined;
            return <tr key={id}><td>{label}<br /><small className="faint">{what}</small></td><td>{l ? l.v.toFixed(2) : '—'}</td><td>{l && p ? <Chg v={l.v - p.v} suffix="" invert={invert} /> : '—'}</td><td><Spark data={spk(s, id === 'NFCI' || id === 'STLFSI4' ? 52 : 260)} w={56} h={16} color={T.accent} fill={false} /></td></tr>;
          })}
        </tbody>
      </table>
    </Panel>
  );
}

// ---------------------------------------------------------------- Treasury auctions
export function Auctions() {
  const a = useSource(AUCTIONS);
  const [tab, setTab] = useState<'results' | 'upcoming'>('results');
  const list = a.data?.[tab] ?? [];
  return (
    <Panel id="p-auctions" title="Treasury auctions" src={a} span="c4" right={<Tabs small value={tab} onChange={setTab} options={[['results', 'Results'], ['upcoming', 'Upcoming']]} />}
      note="High yield for notes/bonds; investment rate for bills. Bid-to-cover above ~2.5 is usually considered solid demand.">
      {list.length ? (
        <table className="t">
          <thead><tr><th>Security</th><th>Date</th>{tab === 'results' ? <><th>Rate</th><th>Cover</th></> : <th>Size</th>}</tr></thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.cusip + x.date}>
                <td>{x.term} {x.type}{x.reopening ? <small className="faint"> (reopen)</small> : ''}</td>
                <td className="dim">{dateLabel(x.date, false)}</td>
                {tab === 'results' ? <><td>{isNum(x.rate) ? x.rate.toFixed(3) + '%' : '—'}</td><td className={isNum(x.btc) ? (x.btc >= 2.5 ? 'up' : x.btc < 2.2 ? 'down' : '') : ''}>{isNum(x.btc) ? x.btc.toFixed(2) + '×' : '—'}</td></> : <td>{big(x.offering, 0)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="empty">{tab === 'upcoming' ? 'No auctions announced yet for the coming days.' : 'No results.'}</div>}
    </Panel>
  );
}
