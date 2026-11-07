import { useState } from 'react';
import { atOrBefore, CURVE, GLOBAL_CREDIT, diffSeries, FRED_DAILY, FRED_MACRO, last, pctChangeSeries, yoySeries, type Series } from '@/data/fred';
import { AUCTIONS, IMF, POLICY, type PolicyRate } from '@/data/sources';
import { COUNTRIES } from '@/data/universe';
import { useSource } from '@/data/store';
import { useQuotes } from '@/data/yahoo';
import { FOMC_2026 } from '@/data/universe';
import { big, bp, dateLabel, isNum, isoDaysAgo, monthLabel, num, signed } from '@/lib/format';
import { Chg, Panel, Spark, Tabs, Big, useNow } from '@/ui/kit';
import { ECOCAL, GOVIES, GOV_YIELDS } from '@/data/global';
import { CurveChart } from '@/ui/charts';
import { T } from '@/ui/theme';

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
        <div className="kpi"><span>2s10s</span><b className={(v('T10Y2Y') ?? 0) < 0 ? 'down' : ''}><Big>{bp(v('T10Y2Y'))}</Big></b><small>{(v('T10Y2Y') ?? 0) < 0 ? 'inverted' : 'positive'}</small></div>
        <div className="kpi"><span>3m10y</span><b className={(v('T10Y3M') ?? 0) < 0 ? 'down' : ''}><Big>{bp(v('T10Y3M'))}</Big></b></div>
        <div className="kpi"><span>10Y real</span><b><Big>{isNum(v('DFII10')) ? num(v('DFII10')) + '%' : '—'}</Big></b><small>TIPS</small></div>
        <div className="kpi"><span>10Y breakeven</span><b><Big>{isNum(v('T10YIE')) ? num(v('T10YIE')) + '%' : '—'}</Big></b></div>
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
        <div className="kpi"><span>Fed target range</span><b><Big>{lo && hi ? `${lo.v.toFixed(2)}–${hi.v.toFixed(2)}%` : '—'}</Big></b><small>{hi ? dateLabel(hi.d) : ''}</small></div>
        <div className="kpi"><span>Next FOMC</span><b><Big>{next ? dateLabel(next, false) : '—'}</Big></b><small>{days != null ? `in ${days} day${days === 1 ? '' : 's'}` : 'schedule not yet published'}</small></div>
        <div className="kpi"><span>Futures-implied</span><b><Big>{isNum(implied) ? implied.toFixed(3) + '%' : '—'}</Big></b><small>{isNum(implied) && effr ? `${bp(implied - effr.v)} vs EFFR` : 'front month'}</small></div>
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
        <thead><tr><th>Indicator</th><th>Latest</th><th className="hs">Prior</th><th className="hs">Period</th><th>2-year trend</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const better = r.delta == null || r.delta === 0 || !r.good ? 'flat' : (r.delta > 0) === (r.good === 'up') ? 'up' : 'down';
            return <tr key={r.label}><td>{r.label}</td><td><b className={better}>{r.value}</b></td><td className="dim hs">{r.prior}</td><td className="dim hs">{r.when}</td><td><Spark data={r.trend} w={90} h={18} color={T.accent} /></td></tr>;
          })}
        </tbody>
      </table>
    </Panel>
  );
}

// ---------------------------------------------------------------- credit & financial conditions
export function Credit() {
  const f = useSource(FRED_DAILY);
  const [tab, setTab] = useState<'us' | 'global'>('us');
  const d = f.data;
  const items: [string, string, string, boolean][] = [
    ['High-yield spread', 'BAMLH0A0HYM2', 'ICE BofA US HY OAS', true], ['Investment-grade spread', 'BAMLC0A0CM', 'ICE BofA US corporate OAS', true],
    ['Chicago Fed NFCI', 'NFCI', 'below 0 = looser than average', true], ['St. Louis stress index', 'STLFSI4', 'below 0 = less stress than average', true],
    ['Broad trade-weighted dollar', 'DTWEXBGS', 'index', false],
  ];
  const chg = (s: Series | undefined, days: number) => { const l = last(s), p = s && l ? atOrBefore(s, isoDaysAgo(days, new Date(l.d))) : undefined; return l && p ? l.v - p.v : null; };
  return (
    <Panel id="p-credit" title="Credit & financial conditions" src={f} span="c4" right={<Tabs small value={tab} onChange={setTab} options={[['us', 'US'], ['global', 'Global']]} />}
      note={tab === 'us' ? 'Spreads in percentage points over Treasuries. Colours: tighter/looser = green.' : 'ICE BofA option-adjusted spreads over government bonds, in basis points, via FRED (one-day lag). Tighter = green.'}>
      {tab === 'us' ? (
        <table className="t">
          <thead><tr><th>Measure</th><th>Latest</th><th>3M</th><th>1Y</th></tr></thead>
          <tbody>
            {items.map(([label, id, what, invert]) => {
              const s = d?.[id], l = last(s), c3 = chg(s, 91);
              return <tr key={id}><td>{label}<br /><small className="faint">{what}</small></td><td>{l ? l.v.toFixed(2) : '—'}</td><td>{isNum(c3) ? <Chg v={c3} suffix="" invert={invert} /> : '—'}</td><td><Spark data={spk(s, id === 'NFCI' || id === 'STLFSI4' ? 52 : 260)} w={56} h={16} color={T.accent} fill={false} /></td></tr>;
            })}
          </tbody>
        </table>
      ) : (
        <table className="t">
          <thead><tr><th>Index</th><th>OAS</th><th>1M</th><th>1Y</th></tr></thead>
          <tbody>
            {['US', 'Europe', 'Emerging'].map((grp) => [
              <tr key={grp} className="grp"><td colSpan={4}>{grp === 'US' ? 'US by rating' : grp === 'Europe' ? 'Europe' : 'Emerging markets (USD bonds)'}</td></tr>,
              ...GLOBAL_CREDIT.filter((c) => c[2] === grp).map(([id, label]) => {
                const s = d?.[id], l = last(s), c1 = chg(s, 30);
                return <tr key={id}><td>{label}</td><td>{l ? Math.round(l.v * 100) : '—'}</td><td>{isNum(c1) ? <Chg v={Math.round(c1 * 100)} dp={0} suffix="" invert /> : '—'}</td><td><Spark data={spk(s, 260)} w={56} h={16} color={T.accent} fill={false} /></td></tr>;
              }),
            ])}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- economic calendar (this week)
const CUR_NAME: Record<string, string> = { USD: 'United States', EUR: 'Euro area', GBP: 'United Kingdom', JPY: 'Japan', CNY: 'China', CAD: 'Canada', AUD: 'Australia', NZD: 'New Zealand', CHF: 'Switzerland', ALL: 'All' };
export function EconomicCalendar() {
  const c = useSource(ECOCAL);
  const now = useNow();
  const [imp, setImp] = useState<'key' | 'all'>('key');
  const [cur, setCur] = useState('ALL');
  const ev = (c.data ?? []).filter((e) => e.impact !== 'Holiday' && (imp === 'all' || e.impact !== 'Low') && (cur === 'ALL' || e.cur === cur));
  const curs = ['ALL', ...['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'NZD'].filter((x) => c.data?.some((e) => e.cur === x))];
  const days = new Map<string, typeof ev>();
  for (const e of ev) { const k = new Date(e.t).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }); days.set(k, [...(days.get(k) ?? []), e]); }
  const nextIdx = ev.findIndex((e) => e.t >= now);
  return (
    <Panel id="p-ecocal" title="Economic calendar" src={c} span="c4" right={<Tabs small value={imp} onChange={setImp} options={[['key', 'Key'], ['all', 'All']]} />}
      note="This week’s scheduled releases from the Forex Factory feed, in your local time. Forecast = consensus; results land in the Economy panel and FRED. Key = high and medium impact.">
      <div className="chips">{curs.map((x) => <button key={x} className={'chip' + (cur === x ? ' on' : '')} onClick={() => setCur(x)} title={CUR_NAME[x]}>{x === 'ALL' ? 'All' : x}</button>)}</div>
      {ev.length ? (
        <table className="t cal">
          <thead><tr><th>Time</th><th className="l">Event</th><th>Fcst</th><th>Prev</th></tr></thead>
          <tbody>
            {[...days].map(([day, list]) => [
              <tr key={day} className="grp"><td colSpan={4}>{day}</td></tr>,
              ...list.map((e) => {
                const i = ev.indexOf(e);
                return <tr key={e.t + e.cur + e.title} className={(e.t < now ? 'past' : '') + (i === nextIdx ? ' next' : '')}>
                  <td className="dim">{new Date(e.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</td>
                  <td className="l"><span className={'imp ' + e.impact.toLowerCase()} title={e.impact + ' impact'} /><b className="cur">{e.cur}</b> {e.title}</td>
                  <td>{e.forecast || '—'}</td><td className="dim">{e.previous || '—'}</td>
                </tr>;
              }),
            ])}
          </tbody>
        </table>
      ) : <div className="empty">{c.data ? 'Nothing scheduled for this filter.' : 'Loading…'}</div>}
    </Panel>
  );
}

// ---------------------------------------------------------------- daily 10-year government yields
export function GovYields() {
  const g = useSource(GOV_YIELDS);
  const f = useSource(FRED_DAILY);
  const us = f.data?.DGS10;
  const rows: { id: string; name: string; what: string; by: string; s?: Series; err?: string }[] = [
    { id: 'US', name: 'United States', what: '10y Treasury', by: 'FRED', s: us, err: f.error },
    ...GOVIES.map((x) => ({ id: x.id, name: x.name, what: x.what, by: x.by, s: g.data?.[x.id]?.series, err: g.data?.[x.id]?.error })),
  ];
  const usL = last(us);
  const chg = (s: Series | undefined, days: number) => { const l = last(s), p = s && l ? atOrBefore(s, isoDaysAgo(days, new Date(l.d))) : undefined; return l && p ? (l.v - p.v) * 100 : null; };
  const prevChg = (s?: Series) => (s && s.length > 1 ? (s[s.length - 1].v - s[s.length - 2].v) * 100 : null);
  return (
    <Panel id="p-govies" title="Government bonds, 10-year" src={[g, f]} span="c4" hasData={!!g.data || !!f.data}
      note="Daily 10-year yields from each country’s central bank or finance ministry (dates differ by a day or two). UK is the BoE zero-coupon 10y; euro area is the ECB curve across all euro governments. Changes in basis points.">
      <table className="t">
        <thead><tr><th>Country</th><th>Yield</th><th>1D</th><th>1M</th><th>vs US</th><th>6M</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const l = last(r.s);
            return <tr key={r.id} title={`${r.what} · ${r.by}${l ? ' · ' + dateLabel(l.d) : ''}`}>
              <td>{r.name}<br /><small className="faint">{l ? `${r.by} · ${dateLabel(l.d, false)}` : r.err ? 'unavailable' : r.by}</small></td>
              <td>{l ? l.v.toFixed(2) + '%' : '—'}</td>
              <td>{isNum(prevChg(r.s)) ? <Chg v={Math.round(prevChg(r.s)!)} dp={0} suffix="" /> : '—'}</td>
              <td>{isNum(chg(r.s, 30)) ? <Chg v={Math.round(chg(r.s, 30)!)} dp={0} suffix="" /> : '—'}</td>
              <td className="dim">{l && usL && r.id !== 'US' ? signed(Math.round((l.v - usL.v) * 100), 0) : '—'}</td>
              <td><Spark data={spk(r.s, 127)} w={52} h={16} color={T.accent} fill={false} /></td>
            </tr>;
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

// ---------------------------------------------------------------- global policy rates (BIS)
const regionName = (() => {
  let dn: Intl.DisplayNames | undefined;
  try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { /* old browser */ }
  return (a: string) => (a === 'XM' ? 'Euro area (ECB)' : dn?.of(a) ?? a);
})();
const shortDate = (d?: string) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '');

export function GlobalRates() {
  const p = useSource(POLICY);
  const [sort, setSort] = useState<'recent' | 'level' | 'year'>('recent');
  const rows: PolicyRate[] = Object.values(p.data ?? {});
  rows.sort((a, b) => sort === 'level' ? b.v - a.v
    : sort === 'year' ? (isNum(b.y1) ? b.v - b.y1! : -999) - (isNum(a.y1) ? a.v - a.y1! : -999)
    : (b.changed ?? '').localeCompare(a.changed ?? ''));
  const hikes = rows.filter((r) => r.changed && r.prev != null && r.v > r.prev && r.changed >= isoDaysAgo(90)).length;
  const cuts = rows.filter((r) => r.changed && r.prev != null && r.v < r.prev && r.changed >= isoDaysAgo(90)).length;
  return (
    <Panel id="p-rates" title="Global policy rates" src={p} span="c4"
      right={<Tabs small value={sort} onChange={setSort} options={[['recent', 'Recent moves'], ['level', 'Level'], ['year', '12m']]} />}
      note={`${rows.length} central banks · last 90 days: ${hikes} hike${hikes === 1 ? '' : 's'}, ${cuts} cut${cuts === 1 ? '' : 's'}. Bank for International Settlements, daily.`}>
      <table className="t long">
        <thead><tr><th>Central bank</th><th>Rate</th><th>Last move</th><th>12m</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.area}>
              <td>{regionName(r.area)}</td>
              <td>{num(r.v, 2)}%</td>
              <td>{r.changed && r.prev != null ? <span title={shortDate(r.changed)}><Chg v={(r.v - r.prev) * 100} dp={0} suffix="bp" /> <small className="faint">{shortDate(r.changed)}</small></span> : <small className="faint">none in 12m</small>}</td>
              <td>{isNum(r.y1) ? <Chg v={(r.v - r.y1!) * 100} dp={0} suffix="bp" /> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// ---------------------------------------------------------------- IMF World Economic Outlook, every tracked country
type WeoCol = { key: string; ind: string; year: number; label: string; dp?: number };
export function WorldOutlook() {
  const s = useSource(IMF);
  const now = new Date().getFullYear();
  const cols: WeoCol[] = [
    { key: 'g0', ind: 'NGDP_RPCH', year: now, label: `GDP ${now}` }, { key: 'g1', ind: 'NGDP_RPCH', year: now + 1, label: `GDP ${now + 1}` },
    { key: 'c0', ind: 'PCPIPCH', year: now, label: `CPI ${now}` }, { key: 'c1', ind: 'PCPIPCH', year: now + 1, label: `CPI ${now + 1}` },
    { key: 'u0', ind: 'LUR', year: now, label: 'Unemp.' }, { key: 'f0', ind: 'GGXCNL_NGDP', year: now, label: 'Fiscal bal.' },
    { key: 'd0', ind: 'GGXWDG_NGDP', year: now, label: 'Gov. debt' }, { key: 'a0', ind: 'BCA_NGDPD', year: now, label: 'Current acct' },
    { key: 'y0', ind: 'NGDPD', year: now, label: 'GDP $bn', dp: 0 },
  ];
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'y0', dir: -1 });
  const val = (iso: string, c: WeoCol) => s.data?.data[iso]?.[c.ind]?.[String(c.year)];
  const col = cols.find((c) => c.key === sort.key) ?? cols[cols.length - 1];
  const rows = COUNTRIES.filter((c) => s.data?.data[c.iso3]).sort((a, b) => {
    const x = val(a.iso3, col), y = val(b.iso3, col);
    return x == null ? 1 : y == null ? -1 : (x - y) * sort.dir;
  });
  const world = s.data?.data.WEOWORLD;
  const tone = (c: WeoCol, v: number) => (c.ind === 'NGDP_RPCH' ? (v < 0 ? 'down' : v >= 4 ? 'up' : '') : c.ind === 'PCPIPCH' ? (v >= 6 ? 'down' : '') : c.ind === 'GGXCNL_NGDP' ? (v <= -5 ? 'down' : '') : c.ind === 'GGXWDG_NGDP' ? (v >= 100 ? 'down' : '') : '');
  return (
    <Panel id="p-weo" title="World economic outlook" src={s} span="c12"
      note={`${s.data?.edition ?? 'IMF World Economic Outlook'}${s.data?.saved ? ` (copy saved from imf.org ${s.data.saved})` : ''}. ${now} and ${now + 1} are IMF projections. Fiscal balance, debt and current account in % of GDP. Click a column to sort; red marks contraction, inflation ≥ 6%, deficits ≥ 5% and debt ≥ 100% of GDP.`}>
      {world && <div className="kpis">
        <div className="kpi"><span>World GDP growth {now}</span><b><Big>{num(world.NGDP_RPCH?.[String(now)], 1) + '%'}</Big></b><small>{now + 1}: {num(world.NGDP_RPCH?.[String(now + 1)], 1)}%</small></div>
        <div className="kpi"><span>World inflation {now}</span><b><Big>{num(world.PCPIPCH?.[String(now)], 1) + '%'}</Big></b><small>{now + 1}: {num(world.PCPIPCH?.[String(now + 1)], 1)}%</small></div>
        {s.data?.data.ADVEC && <div className="kpi"><span>Advanced economies</span><b><Big>{num(s.data.data.ADVEC.NGDP_RPCH?.[String(now)], 1) + '%'}</Big></b><small>GDP growth {now}</small></div>}
        {s.data?.data.OEMDC && <div className="kpi"><span>Emerging & developing</span><b><Big>{num(s.data.data.OEMDC.NGDP_RPCH?.[String(now)], 1) + '%'}</Big></b><small>GDP growth {now}</small></div>}
      </div>}
      <table className="t long">
        <thead><tr><th>Economy</th>{cols.map((c) => (
          <th key={c.key} style={{ cursor: 'pointer', color: sort.key === c.key ? 'var(--text)' : undefined }}
            onClick={() => setSort((p) => ({ key: c.key, dir: p.key === c.key ? (p.dir === 1 ? -1 : 1) : -1 }))}>{c.label}{sort.key === c.key ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}</th>
        ))}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.iso3}><td>{r.name}</td>{cols.map((c) => { const v = val(r.iso3, c); return <td key={c.key} className={v == null ? 'flat' : tone(c, v)}>{v == null ? '—' : c.dp === 0 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1)}</td>; })}</tr>
        ))}</tbody>
      </table>
    </Panel>
  );
}
