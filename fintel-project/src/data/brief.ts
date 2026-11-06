import { last, yoy, type Series } from './fred';
import type { Quote } from './yahoo';
import { COMMODITIES, FX, INDICES, SECTORS, VOL } from './universe';
import { pct, price } from '@/lib/format';

/** Plain-text summary of the data the terminal holds. The model only ever sees these numbers. */
export function briefPrompt(q: Record<string, Quote>, d: Record<string, Series>, m: Record<string, Series>, at = new Date()): string {
  const line = (sym: string, label: string) => { const x = q[sym]; return x ? `${label}: ${price(x.price)} (${pct(x.changePct)})` : null; };
  const out: string[] = [`As of ${at.toUTCString()}.`];
  out.push('EQUITY INDICES: ' + INDICES.flatMap((r) => r.items).map(([s, l]) => line(s, l)).filter(Boolean).join('; '));
  out.push('US SECTORS (1D): ' + SECTORS.map(([s, l]) => line(s, l)).filter(Boolean).join('; '));
  out.push('VOLATILITY: ' + VOL.map(([s, l]) => line(s, l)).filter(Boolean).join('; '));
  out.push('COMMODITIES: ' + COMMODITIES.flatMap((g) => g.items).map(([s, l]) => line(s, l)).filter(Boolean).join('; '));
  out.push('FX: ' + FX.map(([s, l]) => line(s, l)).filter(Boolean).join('; '));
  const y = (id: string, l: string) => { const o = last(d[id]); return o ? `${l} ${o.v.toFixed(2)}% (${o.d})` : null; };
  const rates = [y('DGS2', 'UST 2Y'), y('DGS10', 'UST 10Y'), y('DGS30', 'UST 30Y'), y('T10Y2Y', '2s10s spread'), y('DFEDTARU', 'Fed upper bound'), y('EFFR', 'EFFR'), y('BAMLH0A0HYM2', 'HY OAS')].filter(Boolean);
  if (rates.length) out.push('RATES: ' + rates.join('; '));
  const cpi = yoy(m.CPIAUCSL), core = yoy(m.CPILFESL), u = last(m.UNRATE);
  const macro = [cpi && `CPI YoY ${cpi.v.toFixed(1)}% (${cpi.d})`, core && `Core CPI YoY ${core.v.toFixed(1)}%`, u && `Unemployment ${u.v}% (${u.d})`].filter(Boolean);
  if (macro.length) out.push('MACRO: ' + macro.join('; '));
  return out.join('\n');
}
