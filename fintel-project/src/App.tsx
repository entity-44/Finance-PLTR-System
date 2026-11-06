import { useEffect, useState } from 'react';
import { refreshAll, useAllSources } from '@/data/store';
import { KEY_INFO, getKey, keySource, setKey, type KeyName } from '@/lib/keys';
import { ago } from '@/lib/format';
import { Dot, useNow } from '@/ui/kit';
import { Commodities, Currencies, Heatmap, History, Indices, Sectors, Tape, Volatility, Watchlist } from '@/panels/markets';
import { Auctions, CentralBanks, Credit, Economy, YieldCurve } from '@/panels/macro';
import { Calendar, Crypto, Filings, News, Positioning } from '@/panels/flows';
import { Brief } from '@/panels/brief';
import { WorldMap } from '@/map/WorldMap';
import { CommandBar } from '@/ui/Command';

// Exchange hours (local time) for the clocks. Weekends closed; holidays not modelled.
const CLOCKS: { label: string; tz: string; open: [number, number]; close: [number, number] }[] = [
  { label: 'NYC', tz: 'America/New_York', open: [9, 30], close: [16, 0] },
  { label: 'LDN', tz: 'Europe/London', open: [8, 0], close: [16, 30] },
  { label: 'FRA', tz: 'Europe/Berlin', open: [9, 0], close: [17, 30] },
  { label: 'TYO', tz: 'Asia/Tokyo', open: [9, 0], close: [15, 30] },
  { label: 'HKG', tz: 'Asia/Hong_Kong', open: [9, 30], close: [16, 0] },
];

function Clocks() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="clocks">
      {CLOCKS.map((c) => {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: c.tz, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(now).map((p) => [p.type, p.value]));
        const mins = (Number(parts.hour) % 24) * 60 + Number(parts.minute);
        const open = !['Sat', 'Sun'].includes(parts.weekday) && mins >= c.open[0] * 60 + c.open[1] && mins < c.close[0] * 60 + c.close[1];
        return <span key={c.label} className={open ? 'open' : ''} title={open ? 'Exchange open (regular session)' : 'Exchange closed'}>{c.label}<b>{parts.hour}:{parts.minute}</b></span>;
      })}
    </div>
  );
}

function Settings({ onClose }: { onClose: () => void }) {
  const [vals, setVals] = useState<Record<KeyName, string>>({ finnhub: getKey('finnhub'), groq: getKey('groq') });
  const all = useAllSources();
  const now = useNow();
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div className="modal-in" onClick={(e) => e.stopPropagation()}>
        <h2>OPTIONAL API KEYS</h2>
        <p className="dim" style={{ marginBottom: 14, fontSize: 12 }}>Everything else works without keys. Keys are saved only in this browser.</p>
        {(Object.keys(KEY_INFO) as KeyName[]).map((k) => (
          <div className="field" key={k}>
            <label htmlFor={'k-' + k}>{KEY_INFO[k].label} <small className="faint">({keySource(k) === 'env' ? 'from .env' : keySource(k) === 'browser' ? 'saved' : 'not set'})</small></label>
            <input id={'k-' + k} className="in mono" type="password" autoComplete="off" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} placeholder="paste key" />
            <small>{KEY_INFO[k].unlocks}. Free key at <a href={KEY_INFO[k].url} target="_blank" rel="noreferrer" className="link">{KEY_INFO[k].url.replace('https://', '')}</a></small>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 18 }}>
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn pri" onClick={() => { (Object.keys(vals) as KeyName[]).forEach((k) => setKey(k, vals[k])); onClose(); }}>Save keys</button>
        </div>
        <h2>DATA SOURCES</h2>
        <ul className="srclist">
          {all.sort((a, b) => a.label.localeCompare(b.label)).map((s) => (
            <li key={s.id}><Dot status={s.status} /><span>{s.label} <span className="faint">· {s.provider}</span></span><span className="mono dim" style={{ fontSize: 11 }}>{s.updated ? ago(s.updated, now) : s.status}</span>{s.error && <small>{s.error}</small>}</li>
          ))}
        </ul>
        <button className="btn" style={{ marginTop: 12 }} onClick={refreshAll}>Refresh all now</button>
      </div>
    </div>
  );
}

function Health({ onClick }: { onClick: () => void }) {
  const all = useAllSources();
  const live = all.filter((s) => s.status === 'live').length;
  const bad = all.filter((s) => s.status === 'error' || s.status === 'stale').length;
  const keys = all.filter((s) => s.status === 'needs-key').length;
  return (
    <button className="health" onClick={onClick} title="Data sources and settings">
      <Dot status={bad ? 'stale' : live ? 'live' : 'loading'} />
      {live}/{all.length} live{bad ? ` · ${bad} issue${bad > 1 ? 's' : ''}` : ''}{keys ? ` · ${keys} need key` : ''}
      <span aria-hidden="true" style={{ marginLeft: 4 }}>⚙</span>
    </button>
  );
}

export default function App() {
  const [settings, setSettings] = useState(false);
  const [sel, setSel] = useState('PLTR');
  useEffect(() => { const o = () => setSettings(true); addEventListener('fintel:settings', o); return () => removeEventListener('fintel:settings', o); }, []);
  const pick = (s: string) => { setSel(s); document.getElementById('p-watch')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  return (
    <>
      <header className="top">
        <div className="bar">
          <div className="brand">FINTEL<b>·</b>COMMAND</div>
          <Clocks />
          <div className="sp" />
          <CommandBar onTicker={(s) => setSel(s)} />
          <Health onClick={() => setSettings(true)} />
        </div>
        <Tape />
      </header>
      <main>
        <WorldMap />
        <Indices />
        <div className="sec-h">MARKETS</div>
        <Sectors />
        <Volatility />
        <Currencies />
        <Heatmap onPick={pick} />
        <Commodities />
        <Watchlist sel={sel} setSel={setSel} />
        <Crypto />
        <div className="sec-h">RATES &amp; MACRO</div>
        <YieldCurve />
        <CentralBanks />
        <Credit />
        <Economy />
        <Positioning />
        <div className="sec-h">NEWS, FILINGS &amp; EVENTS</div>
        <News />
        <Filings />
        <Calendar />
        <Auctions />
        <History />
        <Brief />
      </main>
      <footer className="mono faint" style={{ fontSize: 10.5, padding: '6px 16px 20px', textAlign: 'center' }}>
        Data: Yahoo Finance (delayed), FRED, U.S. Treasury, CFTC, SEC EDGAR, World Bank, CoinGecko, mempool.space, alternative.me, Finnhub. For research, not trading advice.
      </footer>
      {settings && <Settings onClose={() => setSettings(false)} />}
    </>
  );
}
