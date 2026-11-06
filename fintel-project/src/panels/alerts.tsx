import { useEffect, useRef, useState } from 'react';
import { useQuotes, type Quote } from '@/data/yahoo';
import { price, pct } from '@/lib/format';
import { STATIC } from '@/lib/env';
import { Panel } from '@/ui/kit';

// Price alerts, kept in this browser. Checked every time quotes refresh; fire once, then re-arm by hand.

export type AlertKind = 'above' | 'below' | 'up' | 'down';
export interface Alert { id: string; symbol: string; kind: AlertKind; value: number; armed: boolean; firedAt?: number; firedPrice?: number }
const KEY = 'fintel.alerts';
const KIND_TEXT: Record<AlertKind, string> = { above: 'price rises above', below: 'price falls below', up: 'is up more than', down: 'is down more than' };

export function load(): Alert[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function store(a: Alert[]) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* ignore */ } }

export function triggered(a: Alert, q: Quote | undefined): boolean {
  if (!q || !a.armed) return false;
  switch (a.kind) {
    case 'above': return q.price > a.value;
    case 'below': return q.price < a.value;
    case 'up': return (q.changePct ?? 0) > a.value;
    case 'down': return (q.changePct ?? 0) < -a.value;
  }
}

function notify(title: string, body: string) {
  window.dispatchEvent(new CustomEvent('fintel:toast', { detail: `${title}: ${body}` }));
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, tag: title }); } catch { /* ignore */ }
}

export function Alerts() {
  const [list, setList] = useState<Alert[]>(load);
  const [sym, setSym] = useState(''); const [kind, setKind] = useState<AlertKind>('above'); const [v, setV] = useState('');
  const q = useQuotes(list.map((a) => a.symbol));
  const seen = useRef(0);
  const save = (l: Alert[]) => { setList(l); store(l); };

  useEffect(() => {
    if (!q.updated || q.updated === seen.current) return;
    seen.current = q.updated;
    let changed = false;
    const next = list.map((a) => {
      const x = q.data?.[a.symbol];
      if (!triggered(a, x)) return a;
      changed = true;
      notify(`${a.symbol} alert`, `${a.symbol} ${KIND_TEXT[a.kind]} ${a.kind === 'up' || a.kind === 'down' ? a.value + '%' : a.value}: now ${price(x!.price)} (${pct(x!.changePct)})`);
      return { ...a, armed: false, firedAt: Date.now(), firedPrice: x!.price };
    });
    if (changed) save(next);
  }, [q.updated]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const s = sym.trim().toUpperCase(), n = Number(v);
    if (!s || !Number.isFinite(n)) return;
    save([...list, { id: Math.random().toString(36).slice(2), symbol: s, kind, value: n, armed: true }]);
    setSym(''); setV('');
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
  };
  return (
    <Panel id="p-alerts" title="Alerts" src={q} span="c4" hasData
      note={`Checked whenever prices refresh${STATIC ? ' (every ~15 min on the website)' : ' (every minute)'} while this tab is open. Saved in this browser only.`}>
      <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 0.8fr auto', gap: 6, marginBottom: 10 }}>
        <input className="in mono" placeholder="Symbol" value={sym} onChange={(e) => setSym(e.target.value)} aria-label="Symbol" />
        <select className="in" value={kind} onChange={(e) => setKind(e.target.value as AlertKind)} aria-label="Condition">
          <option value="above">Price above</option><option value="below">Price below</option><option value="up">Day change ≥ +%</option><option value="down">Day change ≤ −%</option>
        </select>
        <input className="in mono" placeholder={kind === 'up' || kind === 'down' ? '%' : 'Price'} inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} aria-label="Value" />
        <button className="btn pri" type="submit">Add</button>
      </form>
      {list.length ? (
        <table className="t">
          <thead><tr><th>Alert</th><th>Now</th><th>Status</th><th /></tr></thead>
          <tbody>{list.map((a) => {
            const x = q.data?.[a.symbol];
            return <tr key={a.id}>
              <td style={{ whiteSpace: 'normal' }}><b className="mono">{a.symbol}</b> <span className="dim">{KIND_TEXT[a.kind]} {a.kind === 'up' || a.kind === 'down' ? a.value + '%' : price(a.value)}</span></td>
              <td>{x ? price(x.price) : '—'}</td>
              <td>{a.armed ? <span className="dim">watching</span> : <button className="link" title="Re-arm" onClick={() => save(list.map((y) => (y.id === a.id ? { ...y, armed: true } : y)))}>fired · re-arm</button>}</td>
              <td><button className="link" style={{ color: 'var(--faint)', textDecoration: 'none' }} aria-label="Delete alert" onClick={() => save(list.filter((y) => y.id !== a.id))}>×</button></td>
            </tr>;
          })}</tbody>
        </table>
      ) : <p className="dim" style={{ fontSize: 12 }}>No alerts yet. Example: NVDA, price above, 200.</p>}
    </Panel>
  );
}

/** Small toast stack for alert messages. */
export function Toasts() {
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);
  useEffect(() => {
    const f = (e: Event) => { const id = Date.now() + Math.random(); setItems((l) => [...l, { id, text: (e as CustomEvent<string>).detail }]); setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 9000); };
    addEventListener('fintel:toast', f); return () => removeEventListener('fintel:toast', f);
  }, []);
  return <div className="toasts" role="status" aria-live="polite">{items.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>;
}
