import { useMemo, useRef, useState } from 'react';
import { isNum, price } from '@/lib/format';
import { T } from './theme';

function ticks(min: number, max: number, n = 4): number[] {
  const span = max - min || Math.abs(max) || 1;
  const step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= step0) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

const fmtT = (t: number, intraday: boolean) => {
  const d = new Date(t);
  return intraday ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Responsive line chart with axes and a hover read-out. Width follows the container via viewBox. */
export function LineChart({ t, v, h = 200, base, intraday = false, color, fmt = price }: { t: number[]; v: number[]; h?: number; base?: number | null; intraday?: boolean; color?: string; fmt?: (n: number) => string }) {
  const W = 720, L = 6, R = 58, Tp = 8, B = 20;
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const g = useMemo(() => {
    let min = Math.min(...v), max = Math.max(...v);
    if (isNum(base)) { min = Math.min(min, base); max = Math.max(max, base); }
    const pad = (max - min) * 0.06 || 1; min -= pad; max += pad;
    const x = (i: number) => L + (i / (v.length - 1)) * (W - L - R);
    const y = (n: number) => Tp + (1 - (n - min) / (max - min)) * (h - Tp - B);
    const d = v.map((n, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(n).toFixed(1)).join('');
    return { min, max, x, y, d };
  }, [t, v, h, base]);
  const up = v[v.length - 1] >= (isNum(base) ? base : v[0]);
  const c = color || (up ? T.up : T.down);
  const yt = ticks(g.min, g.max, 4);
  const xIdx = [0, Math.floor(v.length / 3), Math.floor((2 * v.length) / 3), v.length - 1];
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(v.length - 1, Math.round(((px - L) / (W - L - R)) * (v.length - 1)))));
  };
  return (
    <svg ref={ref} className="chart" viewBox={`0 0 ${W} ${h}`} width="100%" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Price chart">
      {yt.map((n) => <g key={n}><line x1={L} x2={W - R} y1={g.y(n)} y2={g.y(n)} stroke={T.line} /><text x={W - R + 6} y={g.y(n) + 3}>{fmt(n)}</text></g>)}
      {xIdx.map((i, k) => <text key={k} x={g.x(i)} y={h - 5} textAnchor={k === 0 ? 'start' : k === 3 ? 'end' : 'middle'}>{fmtT(t[i], intraday).replace(/, \d{4}$/, '')}</text>)}
      {isNum(base) && <line x1={L} x2={W - R} y1={g.y(base)} y2={g.y(base)} stroke={T.faint} strokeDasharray="3 3" />}
      <path d={g.d + `L${g.x(v.length - 1)},${h - B}L${g.x(0)},${h - B}Z`} fill={c} opacity="0.08" />
      <path d={g.d} fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      {hover != null && <g>
        <line x1={g.x(hover)} x2={g.x(hover)} y1={Tp} y2={h - B} stroke={T.faint} />
        <circle cx={g.x(hover)} cy={g.y(v[hover])} r="3" fill={c} />
        <rect x={Math.min(g.x(hover) + 6, W - R - 150)} y={Tp} width="146" height="34" rx="4" fill={T.raised} stroke={T.lineHi} />
        <text x={Math.min(g.x(hover) + 12, W - R - 144)} y={Tp + 14} style={{ fill: T.text }}>{fmt(v[hover])}</text>
        <text x={Math.min(g.x(hover) + 12, W - R - 144)} y={Tp + 27}>{fmtT(t[hover], intraday)}</text>
      </g>}
    </svg>
  );
}

/** Several labelled curves on a shared categorical x axis (used for the yield curve). */
export function CurveChart({ labels, series, h = 200, fmt = (n: number) => n.toFixed(2) + '%' }: { labels: string[]; series: { name: string; color: string; values: (number | null)[]; dash?: string }[]; h?: number; fmt?: (n: number) => string }) {
  const W = 720, L = 44, R = 14, Tp = 10, B = 22;
  const all = series.flatMap((s) => s.values).filter(isNum);
  if (!all.length) return null;
  let min = Math.min(...all), max = Math.max(...all);
  const pad = (max - min) * 0.1 || 0.25; min -= pad; max += pad;
  const x = (i: number) => L + (i / (labels.length - 1)) * (W - L - R);
  const y = (n: number) => Tp + (1 - (n - min) / (max - min)) * (h - Tp - B);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${h}`} width="100%" role="img" aria-label="Yield curve">
      {ticks(min, max, 4).map((n) => <g key={n}><line x1={L} x2={W - R} y1={y(n)} y2={y(n)} stroke={T.line} /><text x={L - 6} y={y(n) + 3} textAnchor="end">{fmt(n)}</text></g>)}
      {labels.map((l, i) => <text key={l} x={x(i)} y={h - 6} textAnchor="middle">{l}</text>)}
      {series.map((s) => {
        const pts = s.values.map((v, i) => (isNum(v) ? [x(i), y(v)] : null)).filter(Boolean) as number[][];
        return <g key={s.name}>
          <path d={pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('')} fill="none" stroke={s.color} strokeWidth="1.8" strokeDasharray={s.dash} />
          {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill={s.color} />)}
        </g>;
      })}
    </svg>
  );
}
