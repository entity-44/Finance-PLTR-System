import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { T, Panel, Row, Badge, SevBadge, LiveDot, MiniSpark, Sparkline, SectionHeader, riskColor, riskLabel } from '@/theme';
import * as D from '@/data';
import type { HeatmapRect, SectorRect, HistoricalYear, CumulativePoint, WatchlistStock } from '@/types';

const {
  MARKETS, COMMODITIES, FOREX, CRYPTO, YIELDS_DATA, NEWS, FILINGS, ALERTS_DATA,
  SECTORS, BANKS, FED_DATA, ECON, IPO_MA, OPTIONS_FLOW, MACRO_CALENDAR,
  VOLATILITY, INSIDER, EARNINGS_RADAR, DARKPOOL, GEOPOLITICAL,
  ETF_DATA, BOND_RATINGS, FED_FUTURES, SHORT_INTEREST, BREADTH,
  SP500_HEATMAP, SP500_HISTORY, COUNTRY_DATA, FIN_NODES, FLOW_PAIRS, CABLES, PIPELINES,
} = D;


export const SP500HeatmapPanel = memo(function SP500HeatmapPanel() {
  const [hovered, setHovered] = useState(null);
  const [filter,  setFilter]  = useState("ALL");

  const VW = 900, VH = 540;
  const HEADER_H = 16; // px reserved at top of each sector for its label bar
  const GAP = 1;

  // Squarified treemap layout
  function layoutRect(items: any[], x: number, y: number, w: number, h: number): any[] {
    if (!items.length || w < 1 || h < 1) return [];
    const total = items.reduce((a, i) => a + i.mc, 0);
    if (total === 0) return [];
    const scale = (w * h) / total;
    const scaled = items.map(i => ({ ...i, area: i.mc * scale }));
    const results = [];

    function worstRatio(row, len) {
      if (!row.length) return Infinity;
      const s = row.reduce((a, i) => a + i.area, 0);
      const mx = Math.max(...row.map(i => i.area));
      const mn = Math.min(...row.map(i => i.area));
      return Math.max((len * len * mx) / (s * s), (s * s) / (len * len * mn));
    }

    let rem = [...scaled];
    let cx = x, cy = y, cw = w, ch = h;

    while (rem.length) {
      const horiz = cw >= ch;
      const len = horiz ? cw : ch;
      let row = [], prev = Infinity;

      while (rem.length) {
        const next = [...row, rem[0]];
        const curr = worstRatio(next, len);
        if (row.length && curr > prev) break;
        row.push(rem.shift());
        prev = curr;
      }

      const rowArea = row.reduce((a, i) => a + i.area, 0);
      if (horiz) {
        const rh = rowArea / cw;
        let rx = cx;
        row.forEach(item => {
          const rw = item.area / rh;
          results.push({ ...item, x: rx, y: cy, w: Math.max(0, rw), h: Math.max(0, rh) });
          rx += rw;
        });
        cy += rh; ch -= rh;
      } else {
        const rw = rowArea / ch;
        let ry = cy;
        row.forEach(item => {
          const rh = item.area / rw;
          results.push({ ...item, x: cx, y: ry, w: Math.max(0, rw), h: Math.max(0, rh) });
          ry += rh;
        });
        cx += rw; cw -= rw;
      }
      if (cw < 0.5 || ch < 0.5) break;
    }
    return results;
  }

  // Layout sectors across full canvas
  const sectorItems = SP500_HEATMAP.map(s => ({
    sector: s.sector,
    mc: s.stocks.reduce((a, st) => a + st.mc, 0),
  })).filter(s => s.mc > 0);

  const sectorRects = layoutRect(sectorItems, 0, 0, VW, VH);

  // Layout stocks within each sector, pushed down by HEADER_H
  // so the sector header bar has clean space
  const allRects = [];
  sectorRects.forEach(sr => {
    const sec = SP500_HEATMAP.find(s => s.sector === sr.sector);
    if (!sec) return;
    const stocks = sec.stocks.filter(s => s.mc > 0);
    // stock area starts below the header
    const stockY = sr.y + HEADER_H;
    const stockH = sr.h - HEADER_H;
    if (stockH < 4) return;
    const rects = layoutRect(stocks, sr.x, stockY, sr.w, stockH);
    rects.forEach(r => allRects.push({
      ...r,
      sector: sr.sector,
      sectorX: sr.x, sectorY: sr.y, sectorW: sr.w, sectorH: sr.h,
    }));
  });

  // Precompute sector performance for colors
  const sectorPerf = {};
  SP500_HEATMAP.forEach(sec => {
    const v = sec.stocks.filter(s => s.mc > 0);
    const tot = v.reduce((a, s) => a + s.mc, 0);
    sectorPerf[sec.sector] = tot > 0 ? v.reduce((a, s) => a + s.p * s.mc, 0) / tot : 0;
  });

  return (
    <Panel
      title="S&P 500 Heatmap"
      sub="- treemap by market cap"
      right={
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          {[["ALL","ALL"],[">+2%",">+2%"],["<-2%","<-2%"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              background: filter===k ? (k==="<-2%" ? `${T.red}25` : `${T.green}25`) : "none",
              border: `1px solid ${filter===k ? (k==="<-2%" ? T.red+"60" : T.green+"60") : T.border}`,
              color: filter===k ? (k==="<-2%" ? T.red : T.green) : T.grey600,
              padding: "1px 6px", borderRadius: 2, cursor: "pointer",
              fontSize: 8, fontFamily: T.mono,
            }}>{l}</button>
          ))}
          <Badge label="LIVE" color={T.green} />
        </div>
      }>

      {/* Sector summary pill row */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "2px 10px",
        padding: "5px 12px", borderBottom: `1px solid ${T.border}`,
        background: T.surface,
      }}>
        {SP500_HEATMAP.map(sec => {
          const p = sectorPerf[sec.sector] || 0;
          const c = p >= 0 ? T.green : T.red;
          return (
            <div key={sec.sector} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 7, height: 7, borderRadius: 1, background: c, opacity: 0.75, flexShrink: 0 }} />
              <span style={{ fontSize: 8, color: T.grey500, fontFamily: T.mono, whiteSpace: "nowrap" }}>
                {sec.sector}
              </span>
              <span style={{ fontSize: 8, fontWeight: 700, color: c, fontFamily: T.mono }}>
                {p >= 0 ? "+" : ""}{p.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Treemap SVG */}
      <div style={{ lineHeight: 0 }}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", display: "block" }}
          onMouseLeave={() => setHovered(null)}>

          <defs>
            {allRects.map(r => {
              const id = `g${r.t.replace(/[^a-z0-9]/gi, "_")}`;
              const topC = r.p > 0 ? "#22c55e" : "#dc2626";
              const botC = r.p > 0 ? "#052e16" : "#3b0a0a";
              const alpha = Math.min(0.18 + Math.abs(r.p) / 5 * 0.8, 0.96);
              return (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={topC} stopOpacity={alpha} />
                  <stop offset="100%" stopColor={botC} stopOpacity="1" />
                </linearGradient>
              );
            })}
            {/* No gradient needed - headers use flat black fill */}
          </defs>

          {/* ── Sector header bars ─────────────────────────────────────── */}
          {sectorRects.map(sr => {
            const p = sectorPerf[sr.sector] || 0;
            const c = p >= 0 ? "#4ade80" : "#f87171";
            const canShowPerf = sr.w > 80;
            return (
              <g key={"hdr_" + sr.sector} style={{ pointerEvents: "none" }}>
                {/* Header background - pure black for contrast */}
                <rect
                  x={sr.x + 0.5} y={sr.y + 0.5}
                  width={Math.max(0, sr.w - 1)} height={HEADER_H - 0.5}
                  fill="#000000"
                  rx="0"
                />
                {/* Left accent bar */}
                <rect
                  x={sr.x + 0.5} y={sr.y + 0.5}
                  width={2.5} height={HEADER_H - 0.5}
                  fill={c} opacity="0.9"
                />
                {/* Sector name */}
                <text
                  x={sr.x + 7} y={sr.y + HEADER_H * 0.68}
                  fontSize="7.5" fontWeight="800"
                  letterSpacing="0.07em"
                  fontFamily="'JetBrains Mono',monospace"
                  fill="#ffffff"
                  dominantBaseline="middle">
                  {(sr.sector as string).toUpperCase()}
                </text>
                {/* Sector performance — shown if wide enough */}
                {canShowPerf && (
                  <text
                    x={sr.x + sr.w - 4} y={sr.y + HEADER_H * 0.68}
                    fontSize="7.5" fontWeight="700"
                    fontFamily="'JetBrains Mono',monospace"
                    fill={c} textAnchor="end"
                    dominantBaseline="middle">
                    {p >= 0 ? "+" : ""}{p.toFixed(2)}%
                  </text>
                )}
                {/* Bottom border of header */}
                <line
                  x1={sr.x} y1={sr.y + HEADER_H}
                  x2={sr.x + sr.w} y2={sr.y + HEADER_H}
                  stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.12"
                />
                {/* Outer sector border */}
                <rect
                  x={sr.x + 0.5} y={sr.y + 0.5}
                  width={Math.max(0, sr.w - 1)} height={Math.max(0, sr.h - 1)}
                  fill="none"
                  stroke="#ffffff" strokeWidth="1" strokeOpacity="0.14"
                />
              </g>
            );
          })}

          {/* ── Stock tiles ────────────────────────────────────────────── */}
          {allRects.map(r => {
            const id = `g${r.t.replace(/[^a-z0-9]/gi, "_")}`;
            const isH = hovered === r.t;
            const dimmed = filter !== "ALL" &&
              !((filter === ">+2%" && r.p >= 2) || (filter === "<-2%" && r.p <= -2));
            const tx = r.x + GAP, ty = r.y + GAP;
            const tw = Math.max(0, r.w - GAP * 2);
            const th = Math.max(0, r.h - GAP * 2);
            const showTicker = tw > 20 && th > 13;
            const showPct    = tw > 20 && th > 26;
            const bigBox  = tw > 85 && th > 65;
            const midBox  = tw > 42 && th > 36;
            const tSize   = bigBox ? 15 : midBox ? 10 : 8;
            const pSize   = bigBox ? 12 : midBox ? 8.5 : 7;

            return (
              <g key={r.t}
                onMouseEnter={() => setHovered(r.t)}
                style={{ cursor: "pointer" }}>
                {/* Tile fill */}
                <rect
                  x={tx} y={ty} width={tw} height={th}
                  fill={`url(#${id})`} rx="1"
                  opacity={dimmed ? 0.1 : 1}
                  stroke={isH ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.25)"}
                  strokeWidth={isH ? 1.2 : 0.4}
                />
                {/* Top accent stripe */}
                {!dimmed && (
                  <rect x={tx} y={ty} width={tw} height={Math.min(2, th)}
                    fill={r.p > 0 ? "#4ade80" : "#f87171"} opacity={0.55} rx="1" />
                )}
                {/* Ticker */}
                {showTicker && !dimmed && (
                  <text
                    x={tx + tw / 2}
                    y={ty + (showPct ? th * 0.36 : th / 2 + tSize * 0.3)}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={tSize} fontWeight="800"
                    fontFamily="'JetBrains Mono',monospace"
                    fill="#ffffff"
                    style={{ pointerEvents: "none", userSelect: "none" }}>
                    {r.t}
                  </text>
                )}
                {/* % change */}
                {showPct && !dimmed && (
                  <text
                    x={tx + tw / 2} y={ty + th * 0.66}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={pSize} fontWeight="600"
                    fontFamily="'JetBrains Mono',monospace"
                    fill={r.p > 0 ? "#86efac" : "#fca5a5"}
                    style={{ pointerEvents: "none", userSelect: "none" }}>
                    {r.p > 0 ? "+" : ""}{r.p.toFixed(2)}%
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Hover tooltip ──────────────────────────────────────────── */}
          {hovered && (() => {
            const r = allRects.find(s => s.t === hovered);
            if (!r) return null;
            const tw = Math.max(0, r.w - GAP * 2);
            const th = Math.max(0, r.h - GAP * 2);
            const tx = r.x + GAP, ty = r.y + GAP;
            const bw = 138, bh = 66;
            const bx = tx + tw + 6 > VW - bw ? tx - bw - 4 : tx + tw + 4;
            const by = Math.min(Math.max(ty, 2), VH - bh - 2);
            const c  = r.p > 0 ? "#4ade80" : "#f87171";
            return (
              <g style={{ pointerEvents: "none" }}>
                <rect x={bx} y={by} width={bw} height={bh}
                  fill="#060d15" rx="3"
                  stroke={c} strokeWidth="1" strokeOpacity="0.85" opacity="0.98" />
                <rect x={bx} y={by} width={3} height={bh}
                  fill={c} rx="1" opacity="0.9" />
                <text x={bx+10} y={by+17} fontSize="13" fontWeight="800"
                  fill="#fff" fontFamily="monospace">{r.t}</text>
                <text x={bx+10} y={by+30} fontSize="8.5" fill="#6b7280"
                  fontFamily="monospace">{r.sector}</text>
                <text x={bx+10} y={by+47} fontSize="14" fontWeight="700"
                  fill={c} fontFamily="monospace">
                  {r.p > 0 ? "+" : ""}{r.p.toFixed(2)}%
                </text>
                <text x={bx+10} y={by+59} fontSize="7.5" fill="#374151"
                  fontFamily="monospace">weight: {r.mc}</text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Color scale legend */}
      <div style={{
        padding: "5px 12px 6px", display: "flex", alignItems: "center", gap: 8,
        borderTop: `1px solid ${T.border}`, background: T.surface,
      }}>
        <span style={{ fontSize: 8, color: T.grey600, fontFamily: T.mono }}>-5%</span>
        <div style={{
          flex: 1, height: 5, borderRadius: 3,
          background: "linear-gradient(90deg,#7f1d1d,#dc2626,#1a1a1a,#16a34a,#14532d)",
        }} />
        <span style={{ fontSize: 8, color: T.grey600, fontFamily: T.mono }}>+5%</span>
        <span style={{ width: 1, height: 12, background: T.border, margin: "0 6px" }} />
        <span style={{ fontSize: 8, color: T.grey600, fontFamily: T.mono }}>box size = mkt cap weight</span>
      </div>
    </Panel>
  );
}
);

export const HistoricalPerformancePanel = memo(function HistoricalPerformancePanel() {
  const [mode, setMode] = useState("annual"); // annual | cumulative
  const W=520, H=140, PAD={l:38,r:12,t:14,b:28};
  const innerW=W-PAD.l-PAD.r, innerH=H-PAD.t-PAD.b;

  // Build cumulative index (start=100 in 1928)
  let cumData=[{y:1927,v:100}];
  SP500_HISTORY.forEach(d=>{
    const prev=cumData[cumData.length-1].v;
    cumData.push({y:d.y, v:prev*(1+d.r/100)});
  });

  const years = SP500_HISTORY.map(d=>d.y);
  const minY=years[0], maxY=years[years.length-1];

  // Annual bars
  const maxAbs=Math.max(...SP500_HISTORY.map(d=>Math.abs(d.r)));
  const xScale=i=>(i/SP500_HISTORY.length)*innerW;
  const barW=Math.max(2,(innerW/SP500_HISTORY.length)-0.5);
  const yMid=innerH*0.55;
  const yBarScale=v=>(Math.abs(v)/maxAbs)*(innerH*0.42);

  // Cumulative log scale
  const cumMin=100, cumMax=Math.max(...cumData.map(d=>d.v));
  const logMin=Math.log10(cumMin*0.8), logMax=Math.log10(cumMax*1.1);
  const cumX=i=>(i/(cumData.length-1))*innerW;
  const cumY=v=>innerH-((Math.log10(v)-logMin)/(logMax-logMin))*innerH;
  const cumPath=cumData.map((d,i)=>`${i===0?"M":"L"}${cumX(i).toFixed(1)},${cumY(d.v).toFixed(1)}`).join(" ");
  const cumArea=cumPath+` L${innerW},${innerH} L0,${innerH} Z`;

  // Notable events labels
  const events=[
    {y:1929,label:"1929 Crash"},{y:1974,label:"Oil Crisis"},
    {y:1987,label:"Black Monday"},{y:2000,label:"Dot-com"},
    {y:2008,label:"GFC"},{y:2020,label:"COVID"},
  ];

  return (
    <Panel title="S&P 500 Historical Performance" sub="- 1928 to present"
      right={
        <div style={{display:"flex",gap:2}}>
          {[["annual","ANNUAL"],["cumulative","CUMUL."]].map(([k,l])=>(
            <button key={k} onClick={()=>setMode(k)} style={{
              background:mode===k?`${T.blue}25`:"none",
              border:`1px solid ${mode===k?T.blue+"60":T.border}`,
              color:mode===k?T.blue:T.grey600,
              padding:"1px 7px",borderRadius:2,cursor:"pointer",
              fontSize:8,fontFamily:T.mono}}>
              {l}
            </button>
          ))}
        </div>
      }>
      <div style={{padding:"10px 14px 6px"}}>
        {/* Stats bar */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,marginBottom:10}}>
          {[
            ["Avg Annual","10.3%",T.green],
            ["Best Year","53.9% (1954)",T.green],
            ["Worst Year","-43.3% (1931)",T.red],
            ["Bull Markets","26",T.green],
            ["Total Return","~48,000x",T.blue],
          ].map(([k,v,c])=>(
            <div key={k} style={{background:T.surface,borderRadius:3,padding:"5px 7px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:7.5,color:T.grey600,fontFamily:T.mono,marginBottom:2}}>{k}</div>
              <div style={{fontSize:9.5,fontWeight:700,color:c,fontFamily:T.mono,lineHeight:1.2}}>{v}</div>
            </div>
          ))}
        </div>

        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
          <defs>
            <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.blue} stopOpacity="0.35"/>
              <stop offset="100%" stopColor={T.blue} stopOpacity="0.03"/>
            </linearGradient>
            <clipPath id="chartClip">
              <rect x={PAD.l} y={PAD.t} width={innerW} height={innerH}/>
            </clipPath>
          </defs>

          <g transform={`translate(${PAD.l},${PAD.t})`}>
            {mode==="annual" ? (
              <>
                {/* Zero line */}
                <line x1="0" y1={yMid} x2={innerW} y2={yMid} stroke={T.border} strokeWidth="0.8"/>
                {/* Annual bars */}
                {SP500_HISTORY.map((d,i)=>{
                  const x=xScale(i);
                  const h=yBarScale(d.r);
                  const isPos=d.r>0;
                  return (
                    <rect key={d.y} x={x} y={isPos?yMid-h:yMid}
                      width={barW} height={h}
                      fill={isPos?"#22c55e":"#ef4444"}
                      opacity={Math.abs(d.r)>20?0.9:0.65}/>
                  );
                })}
                {/* Decade labels */}
                {[1930,1940,1950,1960,1970,1980,1990,2000,2010,2020].map(yr=>{
                  const i=SP500_HISTORY.findIndex(d=>d.y===yr);
                  if(i<0) return null;
                  return <text key={yr} x={xScale(i)} y={innerH+10} fontSize="7" fill={T.grey600} fontFamily="monospace">{yr}</text>;
                })}
                {/* Notable crash labels */}
                {events.map(e=>{
                  const i=SP500_HISTORY.findIndex(d=>d.y===e.y);
                  if(i<0) return null;
                  const d=SP500_HISTORY[i];
                  const x=xScale(i);
                  return (
                    <g key={e.y}>
                      <line x1={x} y1={yMid} x2={x} y2={d.r>0?yMid-yBarScale(d.r)-2:yMid+yBarScale(d.r)+2}
                        stroke={T.grey600} strokeWidth="0.5" strokeDasharray="2,2"/>
                      <text x={x+1} y={d.r<0?yMid+yBarScale(d.r)+12:yMid-yBarScale(d.r)-4}
                        fontSize="6" fill={T.grey600} fontFamily="monospace">{e.label}</text>
                    </g>
                  );
                })}
                {/* +/- labels */}
                <text x={-2} y={yMid-yBarScale(maxAbs)} fontSize="7" fill={T.green} fontFamily="monospace" textAnchor="end">+{maxAbs.toFixed(0)}%</text>
                <text x={-2} y={yMid+yBarScale(maxAbs)} fontSize="7" fill={T.red} fontFamily="monospace" textAnchor="end">-{maxAbs.toFixed(0)}%</text>
                <text x={-2} y={yMid+3} fontSize="7" fill={T.grey600} fontFamily="monospace" textAnchor="end">0</text>
              </>
            ) : (
              <>
                {/* Log scale grid lines */}
                {[100,1000,10000,100000].map(v=>{
                  const y=cumY(v);
                  if(y<0||y>innerH) return null;
                  return (
                    <g key={v}>
                      <line x1="0" y1={y} x2={innerW} y2={y} stroke={T.border} strokeWidth="0.5" strokeDasharray="3,4"/>
                      <text x={-3} y={y+3} fontSize="7" fill={T.grey600} fontFamily="monospace" textAnchor="end">
                        {v>=10000?"$"+v/100+"k":v>=1000?"$"+v/10:"$"+v}
                      </text>
                    </g>
                  );
                })}
                {/* Area + line */}
                <path d={cumArea} fill="url(#cumGrad)" clipPath="url(#chartClip)"/>
                <path d={cumPath} fill="none" stroke={T.blue} strokeWidth="1.5"
                  strokeLinecap="round" clipPath="url(#chartClip)"/>
                {/* End dot */}
                <circle cx={cumX(cumData.length-1)} cy={cumY(cumData[cumData.length-1].v)}
                  r="3" fill={T.blue} style={{filter:`drop-shadow(0 0 4px ${T.blue})`}}/>
                {/* Decade labels */}
                {[1930,1950,1970,1990,2010,2024].map(yr=>{
                  const i=cumData.findIndex(d=>d.y===yr);
                  if(i<0) return null;
                  return <text key={yr} x={cumX(i)} y={innerH+10} fontSize="7" fill={T.grey600} fontFamily="monospace">{yr}</text>;
                })}
                {/* $1 invested label */}
                <text x={4} y={14} fontSize="7.5" fill={T.grey400} fontFamily="monospace">$1 invested in 1928 = ${Math.round(cumData[cumData.length-1].v).toLocaleString()} today</text>
              </>
            )}
          </g>
        </svg>
      </div>
    </Panel>
  );
}
);

export const WatchlistPanel = memo(function WatchlistPanel() {
  const DEFAULT_WATCHLIST = [
    {ticker:"AAPL",name:"Apple",         price:"$172.40",chg:"+0.82%",pos:true, seed:401,pe:"28.4",vol:"$42.1B",wk52:"$124-$199"},
    {ticker:"NVDA",name:"Nvidia",        price:"$832.40",chg:"+4.82%",pos:true, seed:402,pe:"66.2",vol:"$58.4B",wk52:"$474-$974"},
    {ticker:"MSFT",name:"Microsoft",     price:"$412.80",chg:"+1.14%",pos:true, seed:403,pe:"36.1",vol:"$28.2B",wk52:"$309-$430"},
    {ticker:"AMZN",name:"Amazon",        price:"$185.20",chg:"+1.84%",pos:true, seed:404,pe:"61.3",vol:"$32.1B",wk52:"$118-$198"},
    {ticker:"TSLA",name:"Tesla",         price:"$172.90",chg:"-2.44%",pos:false,seed:405,pe:"42.1",vol:"$24.8B",wk52:"$138-$299"},
    {ticker:"META",name:"Meta",          price:"$524.10",chg:"+2.44%",pos:true, seed:406,pe:"27.8",vol:"$21.4B",wk52:"$274-$531"},
    {ticker:"BRK.B",name:"Berkshire B",  price:"$404.10",chg:"+0.21%",pos:true, seed:407,pe:"21.4",vol:"$8.2B", wk52:"$332-$407"},
    {ticker:"JPM",name:"JPMorgan",       price:"$198.42",chg:"+1.24%",pos:true, seed:408,pe:"12.4",vol:"$14.1B",wk52:"$135-$200"},
  ];

  const [list,    setList]   = useState(DEFAULT_WATCHLIST);
  const [input,   setInput]  = useState("");
  const [sortBy,  setSortBy] = useState("ticker"); // ticker | chg | price
  const [showAdd, setShowAdd]= useState(false);
  const [alert,   setAlert]  = useState(null); // {ticker, target, dir}
  const [alertInput, setAlertInput] = useState({ticker:"",target:"",dir:"above"});

  const remove = ticker => setList(l=>l.filter(s=>s.ticker!==ticker));

  const add = () => {
    const t = input.trim().toUpperCase();
    if(!t||list.find(s=>s.ticker===t)) { setInput(""); return; }
    // Add as placeholder (in production would fetch live data)
    const seed = Math.floor(Math.random()*900)+100;
    const chgN = (Math.random()*6-3);
    setList(l=>[...l,{
      ticker:t, name:t, price:"$--",
      chg:(chgN>0?"+":"")+chgN.toFixed(2)+"%",
      pos:chgN>0, seed, pe:"--", vol:"--", wk52:"--"
    }]);
    setInput("");
    setShowAdd(false);
  };

  const sorted = [...list].sort((a,b)=>{
    if(sortBy==="chg") return parseFloat(b.chg)-parseFloat(a.chg);
    if(sortBy==="price") return parseFloat(b.price.replace(/[$,]/g,""))-parseFloat(a.price.replace(/[$,]/g,""));
    return a.ticker.localeCompare(b.ticker);
  });

  return (
    <Panel title="Watchlist"
      right={
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          {/* Sort */}
          <div style={{display:"flex",gap:2}}>
            {[["ticker","A-Z"],["chg","CHG"],["price","$"]].map(([k,l])=>(
              <button key={k} onClick={()=>setSortBy(k)} style={{
                background:sortBy===k?`${T.blue}25`:"none",
                border:`1px solid ${sortBy===k?T.blue+"60":T.border}`,
                color:sortBy===k?T.blue:T.grey600,
                padding:"1px 5px",borderRadius:2,cursor:"pointer",
                fontSize:8,fontFamily:T.mono}}>{l}</button>
            ))}
          </div>
          <button onClick={()=>setShowAdd(v=>!v)} style={{
            background:showAdd?`${T.green}20`:"none",
            border:`1px solid ${showAdd?T.green+"55":T.border}`,
            color:showAdd?T.green:T.grey400,
            padding:"2px 8px",borderRadius:2,cursor:"pointer",
            fontSize:9,fontFamily:T.mono,fontWeight:700}}>
            {showAdd?"x":"+ ADD"}
          </button>
        </div>
      }>

      {/* Add ticker input */}
      {showAdd&&(
        <div style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`,
          background:`${T.green}08`,display:"flex",gap:6,alignItems:"center"}}>
          <input
            value={input}
            onChange={e=>setInput(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==="Enter"&&add()}
            placeholder="Enter ticker (e.g. GOOG)"
            style={{flex:1,background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:3,padding:"5px 8px",color:T.white,fontSize:11,
              fontFamily:T.mono,outline:"none"}}
          />
          <button onClick={add} style={{
            background:`${T.green}20`,border:`1px solid ${T.green}55`,
            color:T.green,padding:"5px 10px",borderRadius:3,
            cursor:"pointer",fontSize:10,fontFamily:T.mono,fontWeight:700}}>
            ADD
          </button>
        </div>
      )}

      {/* Column headers */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 80px 60px 50px 34px",
        padding:"4px 14px",borderBottom:`1px solid ${T.border}`}}>
        {["TICKER","PRICE","CHG","P/E",""].map(h=>(
          <div key={h} style={{fontSize:8,color:T.grey600,fontFamily:T.mono,letterSpacing:"0.06em"}}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      {sorted.map(s=>(
        <div key={s.ticker}
          style={{display:"grid",gridTemplateColumns:"1fr 80px 60px 50px 34px",
            padding:"6px 14px",borderBottom:`1px solid ${T.border}`,
            alignItems:"center",cursor:"pointer",transition:"background 0.1s"}}
          onMouseEnter={e=>e.currentTarget.style.background=T.surface}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.white,fontFamily:T.mono}}>{s.ticker}</div>
            <div style={{fontSize:8.5,color:T.grey600}}>{s.name}</div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono}}>{s.price}</div>
          <div style={{fontSize:11,fontWeight:700,color:s.pos?T.green:T.red,fontFamily:T.mono}}>{s.chg}</div>
          <div style={{fontSize:10,color:T.grey400,fontFamily:T.mono}}>{s.pe}</div>
          <button onClick={()=>remove(s.ticker)} style={{
            background:"none",border:`1px solid ${T.border}`,
            color:T.grey600,borderRadius:2,cursor:"pointer",
            fontSize:11,padding:"1px 5px",lineHeight:1,
            transition:"all 0.1s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.red;e.currentTarget.style.color=T.red;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.grey600;}}>
            x
          </button>
        </div>
      ))}

      {list.length===0&&(
        <div style={{padding:20,textAlign:"center",fontSize:11,color:T.grey600,fontFamily:T.mono}}>
          No stocks in watchlist. Click + ADD to start.
        </div>
      )}

      {/* Footer summary */}
      <div style={{padding:"6px 14px",borderTop:`1px solid ${T.border}`,
        display:"flex",gap:12,background:T.surface}}>
        <span style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>{list.length} STOCKS</span>
        <span style={{fontSize:9,color:T.green,fontFamily:T.mono}}>
          {list.filter(s=>s.pos).length} GAINING
        </span>
        <span style={{fontSize:9,color:T.red,fontFamily:T.mono}}>
          {list.filter(s=>!s.pos).length} DECLINING
        </span>
        <span style={{marginLeft:"auto",fontSize:9,color:T.grey600,fontFamily:T.mono}}>
          Type ticker + Enter to add
        </span>
      </div>
    </Panel>
  );
}
);


export const ETFPanel = memo(function ETFPanel() {
  const [cat, setCat] = useState("All");
  const cats = ["All", "US Equity", "Intl Equity", "Fixed Income", "Sector", "Commodity", "Thematic"];
  const shown = cat === "All" ? ETF_DATA : ETF_DATA.filter(e => e.cat === cat);

  return (
    <Panel title="ETF Monitor"
      sub="- flows & performance"
      right={<Badge label="ETFs" color={T.blue}/>}>

      {/* Category filter */}
      <div style={{display:"flex",gap:3,flexWrap:"wrap",
        padding:"6px 12px",borderBottom:`1px solid ${T.border}`,background:T.surface}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{
            background:cat===c?`${T.blue}22`:"none",
            border:`1px solid ${cat===c?T.blue+"55":T.border}`,
            color:cat===c?T.blue:T.grey600,
            padding:"2px 7px",borderRadius:2,cursor:"pointer",
            fontSize:8,fontFamily:T.mono,whiteSpace:"nowrap",
          }}>{c}</button>
        ))}
      </div>

      {/* Column headers */}
      <div style={{display:"grid",
        gridTemplateColumns:"48px 1fr 60px 52px 54px 52px 46px",
        padding:"4px 12px",borderBottom:`1px solid ${T.border}`}}>
        {["SYM","NAME / CATEGORY","AUM","PRICE","CHG","YTD","EXP"].map(h=>(
          <div key={h} style={{fontSize:8,color:T.grey600,
            fontFamily:T.mono,letterSpacing:"0.05em"}}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{maxHeight:340,overflowY:"auto"}}>
        {shown.map(e=>(
          <div key={e.sym}
            style={{display:"grid",
              gridTemplateColumns:"48px 1fr 60px 52px 54px 52px 46px",
              padding:"5px 12px",borderBottom:`1px solid ${T.border}`,
              alignItems:"center",cursor:"pointer",transition:"background 0.1s"}}
            onMouseEnter={el=>el.currentTarget.style.background=T.surface}
            onMouseLeave={el=>el.currentTarget.style.background="transparent"}>
            <div>
              <div style={{fontSize:10,fontWeight:800,color:T.white,
                fontFamily:T.mono}}>{e.sym}</div>
              <div style={{fontSize:7.5,color:
                e.cat==="US Equity"?T.blue:
                e.cat==="Fixed Income"?"#a78bfa":
                e.cat==="Commodity"?"#f59e0b":
                e.cat==="Thematic"?"#06b6d4":T.grey600,
                fontFamily:T.mono}}>{e.cat}</div>
            </div>
            <div style={{fontSize:9,color:T.grey400,paddingRight:4,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.name}</div>
            <div style={{fontSize:9,color:T.grey400,fontFamily:T.mono}}>{e.aum}</div>
            <div style={{fontSize:10,fontWeight:700,color:T.white,fontFamily:T.mono}}>{e.price}</div>
            <div style={{fontSize:10,fontWeight:700,
              color:e.pos?T.green:T.red,fontFamily:T.mono}}>{e.chg}</div>
            <div style={{fontSize:9,fontWeight:600,
              color:e.ytd.startsWith("+")?T.green:T.red,fontFamily:T.mono}}>{e.ytd}</div>
            <div style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>{e.exp}</div>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div style={{padding:"5px 12px",borderTop:`1px solid ${T.border}`,
        background:T.surface,display:"flex",gap:16}}>
        {[
          ["Gainers", shown.filter(e=>e.pos).length, T.green],
          ["Decliners", shown.filter(e=>!e.pos).length, T.red],
          ["Avg YTD", (shown.reduce((a,e)=>a+parseFloat(e.ytd),0)/shown.length).toFixed(1)+"%",
            shown.reduce((a,e)=>a+parseFloat(e.ytd),0)>0?T.green:T.red],
        ].map(([k,v,c])=>(
          <div key={k} style={{display:"flex",gap:5,alignItems:"center"}}>
            <span style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>{k}</span>
            <span style={{fontSize:10,fontWeight:700,color:c,fontFamily:T.mono}}>{v}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
);

// Bond Credit Ratings Panel

function ratingGrade(r) {
  if(["AAA","AA+","AA","AA-"].includes(r)) return "IG - Prime";
  if(["A+","A","A-"].includes(r))          return "IG - High";
  if(["BBB+","BBB","BBB-"].includes(r))    return "IG - Medium";
  if(["BB+","BB","BB-"].includes(r))       return "HY - Speculative";
  if(["B+","B","B-"].includes(r))          return "HY - Risky";
  if(["CCC","CC","C"].includes(r))         return "Distressed";
  if(r==="D")                              return "Default";
  return "";
}
function ratingColor(r) {
  if(["AAA","AA+","AA","AA-"].includes(r)) return "#10b981";
  if(["A+","A","A-"].includes(r))          return "#22c55e";
  if(["BBB+","BBB","BBB-"].includes(r))    return "#3b82f6";
  if(["BB+","BB","BB-"].includes(r))       return "#f97316";
  if(["B+","B","B-"].includes(r))          return "#ef4444";
  return "#7f1d1d";
}

export const BondCreditPanel = memo(function BondCreditPanel() {
  const [tab, setTab] = useState("gov"); // gov | corp

  // Rating scale bar widths (AAA=100, D=5)
  const RATING_SCALE = {
    "AAA":100,"AA+":95,"AA":90,"AA-":85,
    "A+":80,"A":75,"A-":70,
    "BBB+":65,"BBB":60,"BBB-":55,
    "BB+":50,"BB":45,"BB-":40,
    "B+":35,"B":30,"B-":25,
    "CCC":18,"CC":12,"C":8,"D":4,
  };

  const govData  = BOND_RATINGS.government;
  const corpData = BOND_RATINGS.corporate;

  return (
    <Panel title="Bond Credit Ratings"
      sub="- sovereign & corporate"
      right={
        <div style={{display:"flex",gap:3}}>
          <button onClick={()=>setTab("gov")} style={{
            background:tab==="gov"?`${T.blue}22`:"none",
            border:`1px solid ${tab==="gov"?T.blue+"55":T.border}`,
            color:tab==="gov"?T.blue:T.grey600,
            padding:"2px 8px",borderRadius:2,cursor:"pointer",
            fontSize:8,fontFamily:T.mono}}>SOVEREIGN</button>
          <button onClick={()=>setTab("corp")} style={{
            background:tab==="corp"?`${T.amber}22`:"none",
            border:`1px solid ${tab==="corp"?T.amber+"55":T.border}`,
            color:tab==="corp"?T.amber:T.grey600,
            padding:"2px 8px",borderRadius:2,cursor:"pointer",
            fontSize:8,fontFamily:T.mono}}>CORPORATE</button>
        </div>
      }>

      {/* Rating scale legend */}
      <div style={{padding:"6px 12px",borderBottom:`1px solid ${T.border}`,
        background:T.surface,display:"flex",gap:0,alignItems:"stretch"}}>
        {[
          {label:"AAA-AA",grade:"Prime / IG",   c:"#10b981"},
          {label:"A",     grade:"High IG",       c:"#22c55e"},
          {label:"BBB",   grade:"Medium IG",     c:"#3b82f6"},
          {label:"BB",    grade:"Spec. Grade",   c:"#f97316"},
          {label:"B",     grade:"Risky / HY",    c:"#ef4444"},
          {label:"CCC-D", grade:"Distressed",    c:"#7f1d1d"},
        ].map((g,i)=>(
          <div key={g.label} style={{flex:1,borderLeft:i>0?`1px solid ${T.border}`:"none",
            padding:"3px 6px"}}>
            <div style={{fontSize:8.5,fontWeight:800,color:g.c,fontFamily:T.mono}}>{g.label}</div>
            <div style={{fontSize:7,color:T.grey600,fontFamily:T.mono,marginTop:1}}>{g.grade}</div>
          </div>
        ))}
      </div>

      {tab==="gov" ? (
        <>
          {/* Sovereign header */}
          <div style={{display:"grid",
            gridTemplateColumns:"1fr 52px 52px 64px 54px 44px 52px",
            padding:"4px 12px",borderBottom:`1px solid ${T.border}`}}>
            {["COUNTRY","RATING","OUTLOOK","10Y YIELD","CDS","DELTA","S&P/FITCH"].map(h=>(
              <div key={h} style={{fontSize:8,color:T.grey600,
                fontFamily:T.mono,letterSpacing:"0.04em"}}>{h}</div>
            ))}
          </div>
          {govData.map(b=>{
            const rc = ratingColor(b.rating);
            const bw = RATING_SCALE[b.rating]||10;
            const deltaPos = b.change.startsWith("-");
            return (
              <div key={b.country}
                style={{borderBottom:`1px solid ${T.border}`,
                  transition:"background 0.1s",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.surface}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {/* Rating bar */}
                <div style={{height:2,background:T.grey800}}>
                  <div style={{height:"100%",width:`${bw}%`,background:rc,
                    transition:"width 0.3s",opacity:0.7}}/>
                </div>
                <div style={{display:"grid",
                  gridTemplateColumns:"1fr 52px 52px 64px 54px 44px 52px",
                  padding:"5px 12px",alignItems:"center"}}>
                  <div style={{fontSize:10,fontWeight:600,color:T.white}}>{b.country}</div>
                  <div style={{display:"inline-flex",alignItems:"center",
                    background:`${rc}18`,border:`1px solid ${rc}40`,
                    borderRadius:3,padding:"1px 5px"}}>
                    <span style={{fontSize:10,fontWeight:800,color:rc,
                      fontFamily:T.mono}}>{b.rating}</span>
                  </div>
                  <div style={{fontSize:8.5,
                    color:b.outlook==="Stable"?T.green:b.outlook==="Positive"?T.blue:T.amber,
                    fontFamily:T.mono}}>{b.outlook}</div>
                  <div style={{fontSize:10,fontWeight:700,color:T.white,
                    fontFamily:T.mono}}>{b.yield10y}</div>
                  <div style={{fontSize:9,
                    color:b.cds>200?T.red:b.cds>80?T.amber:T.grey400,
                    fontFamily:T.mono}}>{b.cds}bps</div>
                  <div style={{fontSize:9,
                    color:deltaPos?T.green:T.red,
                    fontFamily:T.mono}}>{b.change}bps</div>
                  <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>
                    {b.moody} / {b.fitch}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <>
          {/* Corporate header */}
          <div style={{display:"grid",
            gridTemplateColumns:"1fr 52px 60px 70px 70px 52px",
            padding:"4px 12px",borderBottom:`1px solid ${T.border}`}}>
            {["ISSUER","RATING","SECTOR","YIELD","SPREAD","CDS"].map(h=>(
              <div key={h} style={{fontSize:8,color:T.grey600,
                fontFamily:T.mono,letterSpacing:"0.04em"}}>{h}</div>
            ))}
          </div>
          {corpData.map(b=>{
            const rc = ratingColor(b.rating);
            const bw = RATING_SCALE[b.rating]||4;
            const isIG = bw >= 55;
            return (
              <div key={b.issuer}
                style={{borderBottom:`1px solid ${T.border}`,
                  transition:"background 0.1s",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.surface}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {/* Rating bar */}
                <div style={{height:2,background:T.grey800}}>
                  <div style={{height:"100%",width:`${bw}%`,background:rc,opacity:0.7}}/>
                </div>
                <div style={{display:"grid",
                  gridTemplateColumns:"1fr 52px 60px 70px 70px 52px",
                  padding:"5px 12px",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:10,fontWeight:600,color:T.white}}>{b.issuer}</div>
                    <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>
                      {b.ticker} · Mat {b.maturity}
                    </div>
                  </div>
                  <div>
                    <div style={{display:"inline-flex",alignItems:"center",
                      background:`${rc}18`,border:`1px solid ${rc}40`,
                      borderRadius:3,padding:"1px 5px"}}>
                      <span style={{fontSize:10,fontWeight:800,color:rc,
                        fontFamily:T.mono}}>{b.rating}</span>
                    </div>
                    <div style={{fontSize:7,color:T.grey600,fontFamily:T.mono,marginTop:1}}>
                      {isIG?"Inv. Grade":"High Yield"}
                    </div>
                  </div>
                  <div style={{fontSize:9,color:T.grey400,fontFamily:T.mono}}>{b.sector}</div>
                  <div style={{fontSize:10,fontWeight:700,
                    color:parseFloat(b.yield)>7?T.red:parseFloat(b.yield)>5.5?T.amber:T.white,
                    fontFamily:T.mono}}>{b.yield}</div>
                  <div style={{fontSize:9,
                    color:parseInt(b.spread)>200?T.red:parseInt(b.spread)>100?T.amber:T.green,
                    fontFamily:T.mono}}>{b.spread}</div>
                  <div style={{fontSize:9,
                    color:b.cds>500?T.red:b.cds>100?T.amber:T.grey400,
                    fontFamily:T.mono}}>{b.cds===9999?"--":b.cds+"bp"}</div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* IG / HY summary bar */}
      <div style={{padding:"5px 12px",borderTop:`1px solid ${T.border}`,
        background:T.surface,display:"flex",gap:16,alignItems:"center"}}>
        {tab==="corp" ? [
          ["Inv. Grade", corpData.filter(b=>["AAA","AA+","AA","AA-","A+","A","A-","BBB+","BBB","BBB-"].includes(b.rating)).length, T.green],
          ["High Yield", corpData.filter(b=>["BB+","BB","BB-","B+","B","B-"].includes(b.rating)).length, T.amber],
          ["Distressed", corpData.filter(b=>["CCC","CC","C","D"].includes(b.rating)).length, T.red],
        ].map(([k,v,c])=>(
          <div key={k} style={{display:"flex",gap:5,alignItems:"center"}}>
            <span style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>{k}</span>
            <span style={{fontSize:11,fontWeight:700,color:c,fontFamily:T.mono}}>{v}</span>
          </div>
        )) : [
          ["Prime/IG",   govData.filter(b=>["AAA","AA+","AA","AA-","A+","A","A-"].includes(b.rating)).length, T.green],
          ["Invest.",    govData.filter(b=>["BBB+","BBB","BBB-"].includes(b.rating)).length, T.blue],
          ["Spec./HY",   govData.filter(b=>["BB+","BB","BB-","B+","B","B-"].includes(b.rating)).length, T.amber],
          ["Distressed", govData.filter(b=>["CCC","CC","C","D"].includes(b.rating)).length, T.red],
        ].map(([k,v,c])=>(
          <div key={k} style={{display:"flex",gap:5,alignItems:"center"}}>
            <span style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>{k}</span>
            <span style={{fontSize:11,fontWeight:700,color:c,fontFamily:T.mono}}>{v}</span>
          </div>
        ))}
        <span style={{marginLeft:"auto",fontSize:8,color:T.grey600,fontFamily:T.mono}}>
          {tab==="gov"?"Moody's · S&P · Fitch":"CDS = credit default swap spread"}
        </span>
      </div>
    </Panel>
  );
}
);


