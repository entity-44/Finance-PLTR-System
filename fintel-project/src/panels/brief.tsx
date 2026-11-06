import { useState } from 'react';
import { groqBrief } from '@/data/sources';
import { peek } from '@/data/store';
import { last, yoy, type Series } from '@/data/fred';
import { QUOTES, type Quote } from '@/data/yahoo';
import { COMMODITIES, FX, INDICES, SECTORS, VOL } from '@/data/universe';
import { getKey } from '@/lib/keys';
import { pct, price } from '@/lib/format';
import { Panel } from '@/ui/kit';
import type { SourceState } from '@/data/store';

/** Builds a plain-text snapshot of what's on screen. The model only sees these numbers. */
export function snapshot(): string {
  const q = peek<Record<string, Quote>>(QUOTES.id) ?? {};
  const d = peek<Record<string, Series>>('fred:daily') ?? {};
  const m = peek<Record<string, Series>>('fred:macro') ?? {};
  const line = (sym: string, label: string) => { const x = q[sym]; return x ? `${label}: ${price(x.price)} (${pct(x.changePct)})` : null; };
  const out: string[] = [`As of ${new Date().toUTCString()}.`];
  out.push('EQUITY INDICES: ' + INDICES.flatMap((r) => r.items).map(([s, l]) => line(s, l)).filter(Boolean).join('; '));
  out.push('US SECTORS (1D): ' + SECTORS.map(([s, l]) => line(s, l)).filter(Boolean).join('; '));
  out.push('VOLATILITY: ' + VOL.map(([s, l]) => line(s, l)).filter(Boolean).join('; '));
  out.push('COMMODITIES: ' + COMMODITIES.flatMap((g) => g.items).map(([s, l]) => line(s, l)).filter(Boolean).join('; '));
  out.push('FX: ' + FX.map(([s, l]) => line(s, l)).filter(Boolean).join('; '));
  const y = (id: string, l: string) => { const o = last(d[id]); return o ? `${l} ${o.v.toFixed(2)}% (${o.d})` : null; };
  out.push('RATES: ' + [y('DGS2', 'UST 2Y'), y('DGS10', 'UST 10Y'), y('DGS30', 'UST 30Y'), y('T10Y2Y', '2s10s spread'), y('DFEDTARU', 'Fed upper bound'), y('EFFR', 'EFFR'), y('BAMLH0A0HYM2', 'HY OAS')].filter(Boolean).join('; '));
  const cpi = yoy(m.CPIAUCSL), core = yoy(m.CPILFESL), u = last(m.UNRATE);
  out.push('MACRO: ' + [cpi && `CPI YoY ${cpi.v.toFixed(1)}% (${cpi.d})`, core && `Core CPI YoY ${core.v.toFixed(1)}%`, u && `Unemployment ${u.v}% (${u.d})`].filter(Boolean).join('; '));
  return out.join('\n');
}

export function Brief() {
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [err, setErr] = useState('');
  const [at, setAt] = useState<number>();
  const hasKey = !!getKey('groq');
  const src: SourceState<unknown> = { label: 'AI brief', provider: 'Groq · Llama 3.3 70B, from on-screen data', status: !hasKey ? 'needs-key' : state === 'error' ? 'error' : 'live', updated: at, data: text || (hasKey ? '' : undefined), error: err };
  const go = async () => {
    setState('busy'); setErr('');
    try { setText(await groqBrief(snapshot())); setAt(Date.now()); setState('idle'); } catch (e) { setErr((e as Error).message); setState('error'); }
  };
  return (
    <Panel id="p-brief" title="Morning brief" src={src} span="c4" hasData={hasKey}
      right={<button className="btn pri" onClick={go} disabled={state === 'busy'}>{state === 'busy' ? 'Writing…' : text ? 'Rewrite' : 'Write brief'}</button>}
      note="Written by an AI model from the numbers currently on screen only. Check anything important against the panels.">
      {text ? <div className="brief">{text}</div> : <p className="brief-empty">{state === 'error' ? `Couldn't write the brief: ${err}` : 'Generates a short summary of today’s market from the live data in this terminal.'}</p>}
    </Panel>
  );
}
