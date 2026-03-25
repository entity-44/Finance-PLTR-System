import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { T, Panel, Row, Badge, SevBadge, LiveDot, MiniSpark, Sparkline, SectionHeader, riskColor, riskLabel } from '@/theme';
import * as D from '@/data';
import type { FedMeeting, RateOutcome, ShortStock, BreadthData } from '@/types';

const {
  MARKETS, COMMODITIES, FOREX, CRYPTO, YIELDS_DATA, NEWS, FILINGS, ALERTS_DATA,
  SECTORS, BANKS, FED_DATA, ECON, IPO_MA, OPTIONS_FLOW, MACRO_CALENDAR,
  VOLATILITY, INSIDER, EARNINGS_RADAR, DARKPOOL, GEOPOLITICAL,
  ETF_DATA, BOND_RATINGS, FED_FUTURES, SHORT_INTEREST, BREADTH,
  SP500_HEATMAP, SP500_HISTORY, COUNTRY_DATA, FIN_NODES, FLOW_PAIRS, CABLES, PIPELINES,
} = D;


export const FedFuturesPanel = memo(function FedFuturesPanel() {
  const [selected, setSelected] = useState(0);
  const mtg = FED_FUTURES[selected];
  const maxProb = Math.max(...mtg.probs.map(p => p.p));
  const mostLikely = mtg.probs.reduce((a,b) => b.p>a.p?b:a);

  return (
    <Panel title="Fed Funds Rate Probabilities"
      sub="- CME FedWatch"
      right={<Badge label="FUTURES" color={T.blue}/>}>

      {/* Meeting selector */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${T.border}`,
        overflowX:"auto"}}>
        {FED_FUTURES.map((m,i)=>(
          <button key={i} onClick={()=>setSelected(i)} style={{
            background:selected===i?`${T.blue}20`:T.surface,
            borderBottom:selected===i?`2px solid ${T.blue}`:"2px solid transparent",
            border:"none",borderRight:`1px solid ${T.border}`,
            color:selected===i?T.blue:T.grey600,
            padding:"7px 14px",cursor:"pointer",
            fontSize:9,fontFamily:T.mono,whiteSpace:"nowrap",
            transition:"all 0.12s",flexShrink:0,
          }}>
            <div style={{fontWeight:700,letterSpacing:"0.06em"}}>{m.meeting}</div>
            <div style={{fontSize:8,marginTop:1,color:selected===i?T.blue:T.grey600}}>{m.date}</div>
          </button>
        ))}
      </div>

      {/* Current implied rate + most likely outcome */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
        gap:0,borderBottom:`1px solid ${T.border}`}}>
        {[
          ["Implied Rate",    mtg.implied,  T.white],
          ["Prev Close",      mtg.prevDay,  T.grey400],
          ["Day Change",      mtg.change,   mtg.change.startsWith("+")?T.red:T.green],
        ].map(([k,v,c])=>(
          <div key={k} style={{padding:"8px 14px",
            borderRight:`1px solid ${T.border}`}}>
            <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
              letterSpacing:"0.06em",marginBottom:3}}>{k}</div>
            <div style={{fontSize:16,fontWeight:800,color:c,
              fontFamily:T.mono}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Probability bars */}
      <div style={{padding:"10px 14px 6px"}}>
        <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
          letterSpacing:"0.08em",marginBottom:8}}>
          OUTCOME PROBABILITIES - {mtg.meeting.toUpperCase()}
        </div>
        {mtg.probs.map((p,i)=>{
          const isTop = p.p === maxProb;
          return (
            <div key={i} style={{marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",
                justifyContent:"space-between",marginBottom:3}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {isTop && <LiveDot size={5} color={p.color}/>}
                  <span style={{fontSize:10,fontWeight:isTop?700:400,
                    color:isTop?T.white:T.grey400,fontFamily:T.mono}}>
                    {p.label}
                  </span>
                  <span style={{fontSize:8.5,color:T.grey600,
                    fontFamily:T.mono}}>{p.rate}%</span>
                </div>
                <span style={{fontSize:13,fontWeight:800,
                  color:p.color,fontFamily:T.mono}}>{p.p}%</span>
              </div>
              <div style={{height:6,background:T.grey800,borderRadius:3,
                overflow:"hidden"}}>
                <div style={{
                  height:"100%",
                  width:`${p.p}%`,
                  background:p.color,
                  borderRadius:3,
                  opacity:isTop?1:0.55,
                  transition:"width 0.4s ease",
                  boxShadow:isTop?`0 0 8px ${p.color}80`:"none",
                }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cut path timeline */}
      <div style={{padding:"6px 14px 10px",borderTop:`1px solid ${T.border}`}}>
        <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
          letterSpacing:"0.08em",marginBottom:6}}>EXPECTED CUT PATH</div>
        <div style={{display:"flex",alignItems:"center",gap:0,
          overflowX:"auto"}}>
          {FED_FUTURES.map((m,i)=>{
            const cutProb = m.probs.filter(p=>p.label.includes("CUT"))
              .reduce((a,p)=>a+p.p,0);
            const holdProb = m.probs.find(p=>p.label==="HOLD")?.p||0;
            const c = cutProb>60?T.green:cutProb>40?T.blue:T.amber;
            return (
              <div key={i} style={{flex:1,textAlign:"center",
                cursor:"pointer",padding:"4px 2px",
                background:selected===i?`${T.blue}15`:"transparent",
                borderRadius:3,transition:"background 0.1s"}}
                onClick={()=>setSelected(i)}>
                <div style={{fontSize:7.5,color:T.grey600,
                  fontFamily:T.mono,marginBottom:3,
                  whiteSpace:"nowrap"}}>{m.date}</div>
                <div style={{width:32,height:32,borderRadius:"50%",
                  background:`${c}20`,border:`2px solid ${c}`,
                  display:"flex",alignItems:"center",
                  justifyContent:"center",margin:"0 auto 3px"}}>
                  <span style={{fontSize:8,fontWeight:800,
                    color:c,fontFamily:T.mono}}>{cutProb}%</span>
                </div>
                <div style={{fontSize:7,color:T.grey600,
                  fontFamily:T.mono}}>cut</div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
);

// Short Interest Panel
export const ShortInterestPanel = memo(function ShortInterestPanel() {
  const [sort, setSort] = useState("squeeze"); // squeeze | shortFloat | borrowRate | dtc
  const [filter, setFilter] = useState("ALL");

  const sectors = ["ALL", ...new Set(SHORT_INTEREST.map(s=>s.sector))];
  const filtered = filter==="ALL"
    ? SHORT_INTEREST
    : SHORT_INTEREST.filter(s=>s.sector===filter);

  const sorted = [...filtered].sort((a,b)=>{
    if(sort==="shortFloat")  return b.shortFloat - a.shortFloat;
    if(sort==="borrowRate")  return b.borrowRate - a.borrowRate;
    if(sort==="dtc")         return b.dtc - a.dtc;
    return b.squeeze - a.squeeze;
  });

  function squeezeLabel(s) {
    if(s>=90) return {l:"EXTREME", c:"#ef4444"};
    if(s>=75) return {l:"HIGH",    c:"#f97316"};
    if(s>=55) return {l:"MEDIUM",  c:"#eab308"};
    return          {l:"LOW",      c:"#6b7280"};
  }

  return (
    <Panel title="Short Interest Monitor"
      sub="- squeeze risk tracker"
      right={<Badge label="FINRA" color={T.amber}/>}>

      {/* Sort controls */}
      <div style={{display:"flex",gap:3,padding:"6px 12px",
        borderBottom:`1px solid ${T.border}`,background:T.surface,
        flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
          marginRight:4}}>SORT:</span>
        {[["squeeze","SQUEEZE RISK"],["shortFloat","SHORT FLOAT"],
          ["borrowRate","BORROW RATE"],["dtc","DAYS TO COVER"]].map(([k,l])=>(
          <button key={k} onClick={()=>setSort(k)} style={{
            background:sort===k?`${T.red}22`:"none",
            border:`1px solid ${sort===k?T.red+"55":T.border}`,
            color:sort===k?T.red:T.grey600,
            padding:"2px 7px",borderRadius:2,cursor:"pointer",
            fontSize:8,fontFamily:T.mono}}>
            {l}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div style={{display:"grid",
        gridTemplateColumns:"52px 1fr 62px 72px 52px 52px 80px",
        padding:"4px 12px",borderBottom:`1px solid ${T.border}`}}>
        {["TICKER","NAME","SHT FLOAT","BORROW","DTC","SI(M)","SQUEEZE"].map(h=>(
          <div key={h} style={{fontSize:8,color:T.grey600,
            fontFamily:T.mono,letterSpacing:"0.04em"}}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{maxHeight:360,overflowY:"auto"}}>
        {sorted.map(s=>{
          const sq = squeezeLabel(s.squeeze);
          const isExtreme = s.squeeze >= 90;
          return (
            <div key={s.ticker}
              style={{display:"grid",
                gridTemplateColumns:"52px 1fr 62px 72px 52px 52px 80px",
                padding:"5px 12px",
                borderBottom:`1px solid ${T.border}`,
                alignItems:"center",
                background:isExtreme?`${T.red}08`:"transparent",
                cursor:"pointer",transition:"background 0.1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.surface}
              onMouseLeave={e=>e.currentTarget.style.background=isExtreme?`${T.red}08`:"transparent"}>

              <div>
                <div style={{fontSize:11,fontWeight:800,
                  color:isExtreme?T.red:T.white,fontFamily:T.mono}}>
                  {s.ticker}
                </div>
                <div style={{fontSize:7.5,color:T.grey600,
                  fontFamily:T.mono}}>{s.sector}</div>
              </div>

              <div style={{fontSize:9,color:T.grey400,paddingRight:4,
                overflow:"hidden",textOverflow:"ellipsis",
                whiteSpace:"nowrap"}}>{s.name}</div>

              {/* Short Float % with bar */}
              <div>
                <div style={{fontSize:10,fontWeight:700,
                  color:s.shortFloat>30?T.red:s.shortFloat>20?T.amber:T.grey400,
                  fontFamily:T.mono}}>{s.shortFloat}%</div>
                <div style={{height:2,background:T.grey800,
                  borderRadius:1,marginTop:2,width:44}}>
                  <div style={{height:"100%",
                    width:`${Math.min(s.shortFloat/50*100,100)}%`,
                    background:s.shortFloat>30?"#ef4444":"#f97316",
                    borderRadius:1}}/>
                </div>
              </div>

              {/* Borrow Rate */}
              <div>
                <div style={{fontSize:10,fontWeight:700,
                  color:s.borrowRate>50?T.red:s.borrowRate>20?T.amber:T.grey400,
                  fontFamily:T.mono}}>{s.borrowRate}%</div>
                <div style={{fontSize:7.5,color:T.grey600,fontFamily:T.mono}}>
                  {s.borrowRate>50?"HARD TO BORROW":
                   s.borrowRate>20?"SPECIAL":
                   s.borrowRate>5?"WARM":"EASY"}
                </div>
              </div>

              <div style={{fontSize:10,color:T.grey400,
                fontFamily:T.mono}}>{s.dtc}d</div>

              <div style={{fontSize:9,color:T.grey400,
                fontFamily:T.mono}}>{s.si}M</div>

              {/* Squeeze risk score */}
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                <div style={{display:"flex",alignItems:"center",
                  justifyContent:"space-between"}}>
                  <div style={{fontSize:8,fontWeight:700,
                    color:sq.c,fontFamily:T.mono,
                    letterSpacing:"0.04em"}}>{sq.l}</div>
                  <div style={{fontSize:10,fontWeight:800,
                    color:sq.c,fontFamily:T.mono}}>{s.squeeze}</div>
                </div>
                <div style={{height:4,background:T.grey800,
                  borderRadius:2,overflow:"hidden"}}>
                  <div style={{
                    height:"100%",
                    width:`${s.squeeze}%`,
                    borderRadius:2,
                    background:`linear-gradient(90deg,#eab308,#f97316,#ef4444)`,
                    opacity:s.squeeze/100*0.9+0.1,
                  }}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{padding:"5px 12px",borderTop:`1px solid ${T.border}`,
        background:T.surface,display:"flex",gap:16,alignItems:"center"}}>
        {[
          ["Extreme Risk", SHORT_INTEREST.filter(s=>s.squeeze>=90).length, T.red],
          ["High Risk",    SHORT_INTEREST.filter(s=>s.squeeze>=75&&s.squeeze<90).length, T.amber],
          ["Avg Borrow",   (SHORT_INTEREST.reduce((a,s)=>a+s.borrowRate,0)/SHORT_INTEREST.length).toFixed(1)+"%", T.grey400],
        ].map(([k,v,c])=>(
          <div key={k} style={{display:"flex",gap:5,alignItems:"center"}}>
            <span style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>{k}</span>
            <span style={{fontSize:10,fontWeight:700,color:c,fontFamily:T.mono}}>{v}</span>
          </div>
        ))}
        <span style={{marginLeft:"auto",fontSize:8,color:T.grey600,fontFamily:T.mono}}>
          DTC = Days To Cover - SI = Short Interest
        </span>
      </div>
    </Panel>
  );
}
);

// Market Breadth Panel
export const MarketBreadthPanel = memo(function MarketBreadthPanel() {
  const B = BREADTH;
  const adRatio = B.advanceDecline.advancing /
    (B.advanceDecline.advancing + B.advanceDecline.declining);
  const adColor = adRatio > 0.6 ? T.green : adRatio < 0.4 ? T.red : T.amber;

  // Mini sparkline for A/D line
  const adLine = B.advanceDecline.adLine;
  const adMin  = Math.min(...adLine), adMax = Math.max(...adLine);
  const adW = 120, adH = 32;
  const adX = i => (i/(adLine.length-1))*adW;
  const adY = v => adH-2-((v-adMin)/(adMax-adMin||1))*(adH-4);
  const adPath = adLine.map((v,i)=>`${i===0?"M":"L"}${adX(i).toFixed(1)},${adY(v).toFixed(1)}`).join(" ");

  function breadthColor(pct) {
    if(pct>=70) return T.green;
    if(pct>=50) return "#22c55e90";
    if(pct>=40) return T.amber;
    return T.red;
  }

  return (
    <Panel title="Market Breadth & Internals"
      sub="- advance/decline · 52W highs/lows"
      right={
        <Badge
          label={B.advanceDecline.trend.toUpperCase()}
          color={B.advanceDecline.trend==="bullish"?T.green:T.red}/>
      }>

      {/* Top row: A/D ratio + key stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",
        borderBottom:`1px solid ${T.border}`}}>

        {/* Advance / Decline */}
        <div style={{padding:"8px 14px",
          borderRight:`1px solid ${T.border}`}}>
          <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
            marginBottom:4}}>ADVANCE / DECLINE</div>
          <div style={{display:"flex",gap:6,alignItems:"baseline",
            marginBottom:4}}>
            <span style={{fontSize:18,fontWeight:800,color:T.green,
              fontFamily:T.mono}}>{B.advanceDecline.advancing}</span>
            <span style={{fontSize:12,color:T.grey600,fontFamily:T.mono}}>/</span>
            <span style={{fontSize:18,fontWeight:800,color:T.red,
              fontFamily:T.mono}}>{B.advanceDecline.declining}</span>
          </div>
          {/* A/D ratio bar */}
          <div style={{height:5,background:T.grey800,borderRadius:3,
            overflow:"hidden",marginBottom:3}}>
            <div style={{height:"100%",
              width:`${adRatio*100}%`,
              background:`linear-gradient(90deg,${T.green},#4ade80)`,
              borderRadius:3}}/>
          </div>
          <div style={{fontSize:8,color:adColor,fontFamily:T.mono}}>
            {(adRatio*100).toFixed(0)}% advancing
          </div>
        </div>

        {/* A/D Line chart */}
        <div style={{padding:"8px 14px",
          borderRight:`1px solid ${T.border}`}}>
          <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
            marginBottom:4}}>A/D LINE (15D)</div>
          <svg width={adW} height={adH}>
            <defs>
              <linearGradient id="adGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.green} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={T.green} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d={adPath+` L${adW},${adH} L0,${adH} Z`}
              fill="url(#adGrad)"/>
            <path d={adPath} fill="none" stroke={T.green}
              strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx={adX(adLine.length-1)} cy={adY(adLine[adLine.length-1])}
              r="2.5" fill={T.green}/>
          </svg>
          <div style={{fontSize:8,color:T.green,fontFamily:T.mono,marginTop:2}}>
            {adLine[adLine.length-1] > adLine[0] ? "RISING" : "FALLING"} TREND
          </div>
        </div>

        {/* 52W Highs / Lows */}
        <div style={{padding:"8px 14px",
          borderRight:`1px solid ${T.border}`}}>
          <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
            marginBottom:6}}>52W HIGHS / LOWS</div>
          <div style={{display:"flex",alignItems:"center",gap:8,
            marginBottom:6}}>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:T.green,
                fontFamily:T.mono,lineHeight:1}}>{B.sp500.new52wHigh}</div>
              <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>
                NEW HIGHS</div>
            </div>
            <div style={{width:1,height:28,background:T.border}}/>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:T.red,
                fontFamily:T.mono,lineHeight:1}}>{B.sp500.new52wLow}</div>
              <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>
                NEW LOWS</div>
            </div>
          </div>
          <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>
            High/Low Index:
            <span style={{color:T.green,fontWeight:700,marginLeft:4}}>
              {B.highLowIndex}%
            </span>
          </div>
        </div>

        {/* TRIN + McClellan */}
        <div style={{padding:"8px 14px"}}>
          <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
            marginBottom:4}}>TRIN / McCLELLAN</div>
          <div style={{marginBottom:6}}>
            <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>
              ARMS INDEX (TRIN)</div>
            <div style={{fontSize:18,fontWeight:800,fontFamily:T.mono,
              color:B.trin<0.8?T.green:B.trin>1.2?T.red:T.amber,
              lineHeight:1}}>{B.trin}</div>
            <div style={{fontSize:7.5,
              color:B.trin<1?T.green:T.red,fontFamily:T.mono}}>
              {B.trin<0.8?"BULLISH":B.trin>1.2?"BEARISH":"NEUTRAL"}
            </div>
          </div>
          <div style={{display:"flex",gap:2,alignItems:"center"}}>
            <span style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>
              McClellan:
            </span>
            <span style={{fontSize:10,fontWeight:700,fontFamily:T.mono,
              color:B.mcclellan.oscillator>0?T.green:T.red}}>
              {B.mcclellan.oscillator>0?"+":""}{B.mcclellan.oscillator}
            </span>
            <Badge label={B.mcclellan.signal}
              color={B.mcclellan.signal==="OVERBOUGHT"?T.amber:T.green}/>
          </div>
        </div>
      </div>

      {/* % Above Moving Averages */}
      <div style={{padding:"8px 14px",
        borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
          letterSpacing:"0.08em",marginBottom:8}}>
          % OF S&P 500 STOCKS ABOVE MOVING AVERAGE
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          {[
            ["20-Day",  B.sp500.above20dma,  "Short-term momentum"],
            ["50-Day",  B.sp500.above50dma,  "Intermediate trend"],
            ["200-Day", B.sp500.above200dma, "Long-term health"],
          ].map(([label,pct,sub])=>(
            <div key={label} style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",
                marginBottom:3}}>
                <span style={{fontSize:9,color:T.grey400,fontFamily:T.mono}}>
                  {label}
                </span>
                <span style={{fontSize:11,fontWeight:800,fontFamily:T.mono,
                  color:breadthColor(pct)}}>{pct}%</span>
              </div>
              <div style={{height:7,background:T.grey800,borderRadius:4,
                overflow:"hidden",marginBottom:2}}>
                <div style={{height:"100%",width:`${pct}%`,
                  borderRadius:4,
                  background:pct>=70
                    ?"linear-gradient(90deg,#16a34a,#4ade80)"
                    :pct>=50
                    ?"linear-gradient(90deg,#15803d,#22c55e)"
                    :pct>=40
                    ?"linear-gradient(90deg,#b45309,#f59e0b)"
                    :"linear-gradient(90deg,#991b1b,#ef4444)",
                  boxShadow:`0 0 4px ${breadthColor(pct)}40`,
                }}/>
              </div>
              <div style={{fontSize:7.5,color:T.grey600,fontFamily:T.mono}}>
                {sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Volume distribution + P/C ratio */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
        borderBottom:`1px solid ${T.border}`}}>
        <div style={{padding:"8px 14px",
          borderRight:`1px solid ${T.border}`}}>
          <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
            marginBottom:6}}>VOLUME DISTRIBUTION</div>
          <div style={{display:"flex",alignItems:"center",gap:6,
            marginBottom:5}}>
            <span style={{fontSize:9,color:T.green,fontFamily:T.mono,
              minWidth:32}}>{B.upVolume}%</span>
            <div style={{flex:1,height:8,background:`${T.red}40`,
              borderRadius:4,overflow:"hidden",position:"relative"}}>
              <div style={{position:"absolute",left:0,top:0,
                height:"100%",width:`${B.upVolume}%`,
                background:T.green,borderRadius:4,opacity:0.8}}/>
              <div style={{position:"absolute",top:"50%",left:"50%",
                transform:"translate(-50%,-50%)",
                fontSize:7,color:"#fff",fontFamily:T.mono,fontWeight:700,
                zIndex:1}}>UP vs DOWN VOL</div>
            </div>
            <span style={{fontSize:9,color:T.red,fontFamily:T.mono,
              minWidth:32,textAlign:"right"}}>{B.downVolume}%</span>
          </div>
          <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>
            RSI {">"} 50:
            <span style={{color:T.green,fontWeight:700,marginLeft:4}}>
              {B.sp500.rsi50plus}% of S&P stocks</span>
          </div>
        </div>

        <div style={{padding:"8px 14px"}}>
          <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
            marginBottom:6}}>PUT/CALL RATIOS</div>
          {[
            ["Total P/C",  B.putCallRatio,  0.7, 1.0],
            ["Equity P/C", B.equityPutCall, 0.6, 0.9],
          ].map(([k,v,bullish,bearish])=>{
            const c = v<bullish?T.green:v>bearish?T.red:T.amber;
            const sentiment = v<bullish?"BULLISH":v>bearish?"BEARISH":"NEUTRAL";
            return (
              <div key={k} style={{marginBottom:5}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:2}}>
                  <span style={{fontSize:9,color:T.grey400,fontFamily:T.mono}}>{k}</span>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <span style={{fontSize:13,fontWeight:800,
                      color:c,fontFamily:T.mono}}>{v}</span>
                    <Badge label={sentiment} color={c}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sector breadth */}
      <div style={{padding:"8px 14px 10px"}}>
        <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,
          letterSpacing:"0.08em",marginBottom:6}}>
          SECTOR BREADTH - % STOCKS ABOVE 50-DAY MA
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {B.sectorBreadth.map(s=>{
            const c = breadthColor(s.pct);
            return (
              <div key={s.name} style={{display:"flex",
                alignItems:"center",gap:6}}>
                <div style={{fontSize:8.5,color:T.grey400,fontFamily:T.mono,
                  width:90,flexShrink:0}}>{s.name}</div>
                <div style={{flex:1,height:5,background:T.grey800,
                  borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${s.pct}%`,
                    background:c,borderRadius:3,opacity:0.8}}/>
                </div>
                <div style={{fontSize:9,fontWeight:700,color:c,
                  fontFamily:T.mono,width:36,textAlign:"right"}}>
                  {s.pct}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
);

