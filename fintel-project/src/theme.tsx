import React, { useState, memo } from 'react';
import type { Theme, PanelProps, BadgeProps, SevBadgeProps, LiveDotProps, SparklineProps, RowProps, SectionHeaderProps } from '@/types';

// ── Theme object ──────────────────────────────────────────────────────────────
export const T: Theme = {
  bg: '#000000',       surface: '#0a0a0a',   panel: '#111111',   panelHover: '#161616',
  border: '#222222',   borderHi: '#333333',
  white: '#ffffff',    grey100: '#f0f0f0',   grey200: '#cccccc',
  grey400: '#888888',  grey500: '#666666',   grey600: '#444444',
  grey700: '#333333',  grey800: '#1a1a1a',
  green: '#22c55e',    greenDim: '#16a34a',  red: '#ef4444',     redDim: '#dc2626',
  amber: '#f59e0b',    blue: '#3b82f6',
  mono: "'JetBrains Mono','Fira Code',monospace",
  sans: "'DM Sans','Helvetica Neue',sans-serif",
} as const;

// ── Sparkline helpers ─────────────────────────────────────────────────────────
// Pure function — same seed always produces same curve. No side effects.
export function makeSparkData(seed: number, positive: boolean, n = 28): number[] {
  let s = seed;
  const rng = (): number => {
    s = (s * 1_664_525 + 1_013_904_223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  const pts: number[] = [];
  let v = 50;
  const drift = positive ? 0.5 : -0.5;
  for (let i = 0; i < n; i++) {
    v = Math.max(6, Math.min(94, v + drift + (rng() - 0.5) * 10));
    pts.push(v);
  }
  return pts;
}

// ── Sparkline — memoized, only re-renders when seed/positive change ───────────
export const Sparkline = memo(function Sparkline({
  seed = 42, positive = true, width = 80, height = 32, showArea = true,
}: SparklineProps) {
  const pts = makeSparkData(seed, positive);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const sx = (i: number): number => (i / (pts.length - 1)) * width;
  const sy = (v: number): number => height - 3 - ((v - min) / range) * (height - 6);

  const linePath = pts.map((v, i) => {
    if (i === 0) return `M${sx(i).toFixed(1)},${sy(v).toFixed(1)}`;
    const x0 = sx(i - 1), y0 = sy(pts[i - 1]!), x1 = sx(i), y1 = sy(v);
    const cpx = (x0 + x1) / 2;
    return `C${cpx.toFixed(1)},${y0.toFixed(1)} ${cpx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }).join(' ');

  const color = positive ? T.green : T.red;
  const gid = `sp${seed}${positive ? 1 : 0}`;

  return (
    <svg width={width} height={height} style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && <path d={`${linePath} L${width},${height} L0,${height} Z`} fill={`url(#${gid})`} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={sx(pts.length - 1).toFixed(1)}
        cy={sy(pts[pts.length - 1]!).toFixed(1)}
        r="2.5" fill={color}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
    </svg>
  );
});

// ── MiniSpark — memo wrapper ──────────────────────────────────────────────────
export const MiniSpark = memo(function MiniSpark({
  seed, positive, width = 56, height = 24,
}: Pick<SparklineProps, 'seed' | 'positive' | 'width' | 'height'>) {
  return <Sparkline seed={seed} positive={positive} width={width} height={height} showArea={false} />;
});

// ── LiveDot — purely presentational, always memo ─────────────────────────────
export const LiveDot = memo(function LiveDot({ color = T.green, size = 6 }: LiveDotProps) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'livePulse 2s ease-out infinite', opacity: 0.4 }} />
      <span style={{ position: 'absolute', inset: 1, borderRadius: '50%', background: color }} />
    </span>
  );
});

// ── Badge — memo, no state ────────────────────────────────────────────────────
export const Badge = memo(function Badge({ label, color = T.grey400 }: BadgeProps) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: T.mono,
      whiteSpace: 'nowrap', padding: '2px 6px', borderRadius: 2,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      {label}
    </span>
  );
});

// ── SevBadge ──────────────────────────────────────────────────────────────────
const SEV_MAP = {
  high:   [T.red,    'HIGH'] as const,
  medium: [T.amber,  'MED']  as const,
  low:    [T.grey400,'LOW']  as const,
};

export const SevBadge = memo(function SevBadge({ sev }: SevBadgeProps) {
  const [c, l] = SEV_MAP[sev] ?? SEV_MAP.low;
  return <Badge label={l} color={c} />;
});

// ── Panel ─────────────────────────────────────────────────────────────────────
// Not memo'd — children change frequently; memoizing would be wasted overhead.
export function Panel({ title, sub, right, children, style = {} }: PanelProps) {
  return (
    <div style={{
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6,
      overflow: 'hidden', display: 'flex', flexDirection: 'column', ...style,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px',
        borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0,
      }}>
        <LiveDot size={5} color={T.grey600} />
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: T.grey200, fontFamily: T.mono, textTransform: 'uppercase' }}>
          {title}
        </span>
        {sub && <span style={{ fontSize: 9, color: T.grey600, fontFamily: T.mono }}>{sub}</span>}
        {right && <span style={{ marginLeft: 'auto' }}>{right}</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
    </div>
  );
}

// ── Row — memo with hover state ───────────────────────────────────────────────
export const Row = memo(function Row({ children, hover = true }: RowProps) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setH(true)}
      onMouseLeave={() => hover && setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
        borderBottom: `1px solid ${T.border}`,
        background: h ? T.panelHover : 'transparent',
        transition: 'background 0.1s',
        cursor: hover ? 'pointer' : 'default',
      }}
    >
      {children}
    </div>
  );
});

// ── SectionHeader — purely decorative, always memo ───────────────────────────
export const SectionHeader = memo(function SectionHeader({ label }: SectionHeaderProps) {
  return (
    <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 2px' }}>
      <div style={{ width: 3, height: 14, background: T.blue, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 9, fontWeight: 700, color: T.grey600, letterSpacing: '0.14em', fontFamily: T.mono }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
});

// ── riskColor / riskLabel — pure functions, exported for use everywhere ───────
export function riskColor(r: number): string {
  if (r >= 80) return '#ef4444';
  if (r >= 60) return '#f97316';
  if (r >= 40) return '#eab308';
  if (r >= 20) return '#22c55e';
  return '#10b981';
}

export function riskLabel(r: number): string {
  if (r >= 80) return 'CRITICAL';
  if (r >= 60) return 'HIGH';
  if (r >= 40) return 'ELEVATED';
  if (r >= 20) return 'WATCH';
  return 'STABLE';
}
