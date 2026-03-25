import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { T, Panel, Row, Badge, SevBadge, LiveDot, MiniSpark, Sparkline, SectionHeader, riskColor, riskLabel } from '@/theme';
import * as D from '@/data';
import type { Severity, AlertType } from '@/types';

const {
  MARKETS, COMMODITIES, FOREX, CRYPTO, YIELDS_DATA, NEWS, FILINGS, ALERTS_DATA,
  SECTORS, BANKS, FED_DATA, ECON, IPO_MA, OPTIONS_FLOW, MACRO_CALENDAR,
  VOLATILITY, INSIDER, EARNINGS_RADAR, DARKPOOL, GEOPOLITICAL,
  ETF_DATA, BOND_RATINGS, FED_FUTURES, SHORT_INTEREST, BREADTH,
  SP500_HEATMAP, SP500_HISTORY, COUNTRY_DATA, FIN_NODES, FLOW_PAIRS, CABLES, PIPELINES,
} = D;


export const MarketsPanel = memo(function MarketsPanel() {
  const [expanded,setExpanded]=useState(false);
  const shown=expanded?MARKETS:MARKETS.slice(0,6);
  return (
    <Panel title="Global Indices" right={<Badge label="LIVE" color={T.green}/>}>
      {shown.map(m=>(
        <Row key={m.name}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:600,color:T.white,fontFamily:T.mono}}>{m.name}</div>
            <div style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>P/E {m.pe} · {m.mktCap}</div>
          </div>
          <MiniSpark seed={m.seed} positive={m.pos} width={56} height={24}/>
          <div style={{textAlign:"right",minWidth:60}}>
            <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono}}>{m.val}</div>
            <div style={{fontSize:10,color:m.pos?T.green:T.red,fontWeight:600}}>{m.chg}</div>
          </div>
        </Row>
      ))}
      <button onClick={()=>setExpanded(e=>!e)} style={{width:"100%",padding:"6px",
        background:"none",border:"none",borderTop:`1px solid ${T.border}`,
        color:T.grey600,fontSize:9,cursor:"pointer",fontFamily:T.mono,
        letterSpacing:"0.08em"}}>
        {expanded?"▲ LESS":"▼ +"+(MARKETS.length-6)+" MORE"}
      </button>
    </Panel>
  );
}
);

export const NewsPanel = memo(function NewsPanel() {
  const [filter,setFilter]=useState("ALL");
  const tags=["ALL",...[...new Set(NEWS.map(n=>n.tag))]];
  const filtered=filter==="ALL"?NEWS:NEWS.filter(n=>n.tag===filter);
  return (
    <Panel title="Market Intelligence" sub={`· ${filtered.length} stories`}
      right={
        <div style={{display:"flex",gap:2}}>
          {["ALL","MACRO","EARNINGS"].map(t=>(
            <button key={t} onClick={()=>setFilter(t)} style={{
              background:filter===t?`${T.blue}25`:"none",
              border:`1px solid ${filter===t?T.blue+"60":T.border}`,
              color:filter===t?T.blue:T.grey600,
              padding:"1px 6px",borderRadius:2,cursor:"pointer",
              fontSize:8,fontFamily:T.mono}}>
              {t}
            </button>
          ))}
        </div>
      }>
      {filtered.map((n,i)=>(
        <Row key={i}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3,flexWrap:"wrap"}}>
              <span style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>{n.time}</span>
              <SevBadge sev={n.sev}/>
              <Badge label={n.tag} color={T.grey600}/>
              <span style={{marginLeft:"auto",fontSize:9,color:T.grey600}}>{n.src}</span>
            </div>
            <div style={{fontSize:11,color:T.grey200,lineHeight:1.45}}>{n.title}</div>
          </div>
        </Row>
      ))}
    </Panel>
  );
}
);

export const AlertsPanel = memo(function AlertsPanel() {
  const [dismissed,setDismissed]=useState(new Set());
  const visible=ALERTS_DATA.filter(a=>!dismissed.has(a.id));
  const tc={MARKET:T.blue,FILING:T.amber,MACRO:T.red,NEWS:T.grey400,SIGNAL:"#a855f7"};
  return (
    <Panel title="Alert Center" sub={`· ${visible.length} active`}
      right={
        <button onClick={()=>setDismissed(new Set(ALERTS_DATA.map(a=>a.id)))} style={{
          background:"none",border:`1px solid ${T.border}`,color:T.grey400,
          fontSize:9,padding:"2px 7px",borderRadius:2,cursor:"pointer",fontFamily:T.mono}}>
          CLEAR ALL
        </button>
      }>
      {visible.length===0
        ? <div style={{padding:20,textAlign:"center",fontSize:11,color:T.grey600}}>All alerts cleared</div>
        : visible.map(a=>(
          <div key={a.id} style={{padding:"7px 14px",borderBottom:`1px solid ${T.border}`,
            background:a.sev==="high"?`${T.red}08`:"transparent"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
              {a.sev==="high"&&<LiveDot size={6} color={T.red}/>}
              <Badge label={a.type} color={tc[a.type]||T.grey400}/>
              <SevBadge sev={a.sev}/>
              <span style={{marginLeft:"auto",fontSize:9,color:T.grey600,fontFamily:T.mono}}>{a.time}</span>
              <button onClick={()=>setDismissed(p=>new Set([...p,a.id]))} style={{
                background:"none",border:"none",color:T.grey600,cursor:"pointer",
                fontSize:15,lineHeight:1,padding:"0 0 0 4px"}}>x</button>
            </div>
            <div style={{fontSize:10,color:T.grey200,lineHeight:1.45}}>{a.msg}</div>
          </div>
        ))
      }
    </Panel>
  );
}
);

export const SECPanel = memo(function SECPanel() {
  return (
    <Panel title="SEC Filings" sub="· AI summaries" right={<Badge label="EDGAR" color={T.amber}/>}>
      {FILINGS.map((f,i)=>(
        <div key={i} style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
            <span style={{fontSize:11,fontWeight:800,color:T.white,fontFamily:T.mono,minWidth:38}}>{f.ticker}</span>
            <Badge label={f.type} color={T.amber}/>
            <span style={{marginLeft:"auto",fontSize:9,color:T.grey600,fontFamily:T.mono}}>{f.time}</span>
          </div>
          <div style={{fontSize:9,color:T.grey600,marginBottom:3}}>{f.co}</div>
          <div style={{fontSize:10,color:T.grey200,lineHeight:1.45,
            paddingLeft:8,borderLeft:`2px solid ${T.grey700}`,fontStyle:"italic"}}>{f.ai}</div>
        </div>
      ))}
    </Panel>
  );
}
);

export const CommoditiesPanel = memo(function CommoditiesPanel() {
  return (
    <Panel title="Commodities" right={<Badge label="SPOT" color={T.grey400}/>}>
      {COMMODITIES.map(c=>(
        <Row key={c.name}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:T.white,fontWeight:600}}>{c.name}</div>
            <div style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>
              52W: {c.yr} · 1W: {c.wk}
            </div>
          </div>
          <MiniSpark seed={c.seed} positive={c.pos} width={50} height={24}/>
          <div style={{textAlign:"right",minWidth:64}}>
            <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono}}>{c.val}</div>
            <div style={{fontSize:10,color:c.pos?T.green:T.red,fontWeight:600}}>{c.chg}</div>
          </div>
        </Row>
      ))}
    </Panel>
  );
}
);

export const ForexPanel = memo(function ForexPanel() {
  return (
    <Panel title="FX / Currencies" right={<Badge label="LIVE" color={T.green}/>}>
      {FOREX.map(f=>(
        <Row key={f.pair}>
          <div style={{flex:1,fontSize:12,fontWeight:700,color:T.white,fontFamily:T.mono}}>{f.pair}</div>
          <MiniSpark seed={f.seed} positive={f.pos} width={50} height={24}/>
          <div style={{textAlign:"right",minWidth:80}}>
            <div style={{fontSize:11,color:T.white,fontFamily:T.mono}}>{f.val}</div>
            <div style={{fontSize:10,color:f.pos?T.green:T.red,fontWeight:600}}>{f.chg}</div>
          </div>
        </Row>
      ))}
    </Panel>
  );
}
);

export const CryptoPanel = memo(function CryptoPanel() {
  return (
    <Panel title="Digital Assets" right={<Badge label="CRYPTO" color={T.grey400}/>}>
      <div style={{padding:"6px 14px 4px",display:"flex",gap:16,borderBottom:`1px solid ${T.border}`}}>
        {[["BTC Dom","53.2%","#f59e0b"],["Fear & Greed","72 · Greed","#22c55e"],["Total MCap","$2.81T",T.grey400]].map(([k,v,c])=>(
          <div key={k} style={{flex:1}}>
            <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono,marginBottom:1}}>{k}</div>
            <div style={{fontSize:10,fontWeight:700,color:c,fontFamily:T.mono}}>{v}</div>
          </div>
        ))}
      </div>
      {CRYPTO.map(c=>(
        <Row key={c.sym}>
          <div style={{width:30,height:30,borderRadius:5,flexShrink:0,
            background:T.grey800,border:`1px solid ${T.grey700}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:8,fontWeight:800,color:T.white,fontFamily:T.mono}}>{c.sym}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:600,color:T.white}}>{c.name}</div>
            <div style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>Dom {c.dom} · {c.mcap}</div>
          </div>
          <MiniSpark seed={c.seed} positive={c.pos} width={50} height={24}/>
          <div style={{textAlign:"right",minWidth:64}}>
            <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono}}>{c.val}</div>
            <div style={{fontSize:10,color:c.pos?T.green:T.red,fontWeight:600}}>{c.chg}</div>
          </div>
        </Row>
      ))}
    </Panel>
  );
}
);

export const FixedIncomePanel = memo(function FixedIncomePanel() {
  const min=Math.min(...YIELDS_DATA.map(d=>d.v));
  const max=Math.max(...YIELDS_DATA.map(d=>d.v));
  const W=220,H=54;
  const sx=i=>(i/(YIELDS_DATA.length-1))*W;
  const sy=v=>H-4-((v-min)/(max-min))*(H-12);
  const linePts=YIELDS_DATA.map((d,i)=>`${i===0?"M":"L"}${sx(i).toFixed(1)},${sy(d.v).toFixed(1)}`).join(" ");
  const areaPts=linePts+` L${W},${H} L0,${H} Z`;
  // Detect inversion
  const inverted = YIELDS_DATA[1].v > YIELDS_DATA[4].v;
  return (
    <Panel title="Fixed Income" sub="· yield curve" right={inverted?<Badge label="INVERTED" color={T.red}/>:null}>
      <div style={{padding:"10px 14px 6px"}}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",marginBottom:4}}>
          <defs>
            <linearGradient id="ycg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={inverted?"#ef4444":"#fff"} stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={areaPts} fill="url(#ycg)"/>
          <path d={linePts} fill="none" stroke={inverted?"#ef4444":"#fff"} strokeWidth="1.5" strokeLinecap="round"/>
          {YIELDS_DATA.map((d,i)=>(
            <g key={d.t}>
              <circle cx={sx(i)} cy={sy(d.v)} r="2.2" fill={inverted?"#ef4444":"#fff"}/>
              <text x={sx(i)} y={sy(d.v)-5} textAnchor="middle" fontSize="6.5" fill={T.grey600} fontFamily="monospace">{d.v}%</text>
            </g>
          ))}
        </svg>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          {YIELDS_DATA.map(d=>(
            <div key={d.t} style={{textAlign:"center",fontSize:8,color:T.grey600,fontFamily:T.mono}}>{d.t}</div>
          ))}
        </div>
      </div>
      {[
        {name:"2Y Treasury",val:"4.82%",chg:"+3bps",pos:false},
        {name:"10Y Treasury",val:"4.42%",chg:"+2bps",pos:false},
        {name:"10Y-2Y Spread",val:"-40bps",chg:"-1bps",pos:false},
        {name:"HY Spread",   val:"342bps",chg:"-8bps",pos:true},
        {name:"IG Spread",   val:"102bps",chg:"-3bps",pos:true},
      ].map(r=>(
        <Row key={r.name} hover={false}>
          <div style={{flex:1,fontSize:10,color:T.grey400}}>{r.name}</div>
          <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono,marginRight:8}}>{r.val}</div>
          <div style={{fontSize:9,color:r.pos?T.green:T.red}}>{r.chg}</div>
        </Row>
      ))}
    </Panel>
  );
}
);

export const CentralBanksPanel = memo(function CentralBanksPanel() {
  return (
    <Panel title="Central Banks" sub="· global rates">
      {FED_DATA.map(f=>(
        <Row key={f.label} hover={false}>
          <div style={{flex:1,fontSize:10,color:T.grey400}}>{f.label}</div>
          <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono,marginRight:8}}>{f.val}</div>
          <Badge label={f.status} color={f.ok?T.grey400:T.red}/>
        </Row>
      ))}
      <div style={{padding:"8px 14px",borderTop:`1px solid ${T.border}`,background:T.surface}}>
        <div style={{fontSize:9,color:T.grey600,marginBottom:4,fontFamily:T.mono,letterSpacing:"0.08em"}}>FOMC GUIDANCE</div>
        <div style={{fontSize:10,color:T.grey400,lineHeight:1.6,fontStyle:"italic"}}>
          "Rate cuts contingent on sustained progress toward 2% target. Committee attentive to dual mandate."
        </div>
      </div>
    </Panel>
  );
}
);

export const BankingPanel = memo(function BankingPanel() {
  return (
    <Panel title="Banking System" sub="· systemic monitor">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",
        padding:"5px 14px 4px",borderBottom:`1px solid ${T.border}`}}>
        {["TICKER","PRICE","CHG","CDS","TIER1","NPL"].map(h=>(
          <div key={h} style={{fontSize:8,color:T.grey600,fontFamily:T.mono,letterSpacing:"0.06em"}}>{h}</div>
        ))}
      </div>
      {BANKS.map(b=>(
        <div key={b.ticker} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",
          padding:"6px 14px",borderBottom:`1px solid ${T.border}`,alignItems:"center",
          cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.background=T.surface}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <span style={{fontSize:11,fontWeight:800,color:T.white,fontFamily:T.mono}}>{b.ticker}</span>
          <span style={{fontSize:10,fontWeight:700,color:T.white,fontFamily:T.mono}}>{b.price}</span>
          <span style={{fontSize:10,color:b.pos?T.green:T.red,fontWeight:600}}>{b.chg}</span>
          <span style={{fontSize:10,fontFamily:T.mono,color:b.cds>70?T.amber:T.grey400}}>{b.cds}bp</span>
          <span style={{fontSize:10,fontFamily:T.mono,color:T.grey400}}>{b.tier1}</span>
          <span style={{fontSize:10,fontFamily:T.mono,color:b.npl>"0.55%"?T.amber:T.grey400}}>{b.npl}</span>
        </div>
      ))}
    </Panel>
  );
}
);

export const SectorPanel = memo(function SectorPanel() {
  const mx=Math.max(...SECTORS.map(s=>Math.abs(s.p)));
  return (
    <Panel title="Sector Heatmap" sub="· S&P 500">
      <div style={{padding:"10px 12px",display:"flex",flexWrap:"wrap",gap:4}}>
        {SECTORS.map(s=>{
          const intensity=Math.abs(s.p)/mx;
          const color=s.p>=0?T.green:T.red;
          const bg=s.p>=0
            ?`rgba(34,197,94,${0.06+intensity*0.24})`
            :`rgba(239,68,68,${0.06+intensity*0.24})`;
          return (
            <div key={s.name} style={{
              background:bg,border:`1px solid ${color}20`,borderRadius:4,
              padding:"6px 8px",width:Math.max(72,s.w*3.1),cursor:"pointer",
              transition:"transform 0.1s,border-color 0.1s"
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.05)";e.currentTarget.style.borderColor=`${color}55`}}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.borderColor=`${color}20`}}
            >
              <div style={{fontSize:9,color:T.grey400,lineHeight:1.3,marginBottom:2}}>{s.name}</div>
              <div style={{fontSize:13,fontWeight:800,color,fontFamily:T.mono}}>
                {s.p>0?"+":""}{s.p.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
);

export const IpoMaPanel = memo(function IpoMaPanel() {
  return (
    <Panel title="IPO / M&A Radar" right={<Badge label="DEALS" color={T.blue}/>}>
      {IPO_MA.map((d,i)=>(
        <Row key={i}>
          <Badge label={d.type} color={d.type==="IPO"?T.green:d.type==="SPAC"?T.grey400:T.blue}/>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:600,color:T.white}}>{d.name}</div>
            <div style={{fontSize:9,color:T.grey600}}>{d.sector}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,fontWeight:700,color:T.white,fontFamily:T.mono}}>{d.size}</div>
            <Badge label={d.status} color={d.sc}/>
          </div>
        </Row>
      ))}
    </Panel>
  );
}
);

export const EconPanel = memo(function EconPanel() {
  return (
    <Panel title="Economic Indicators" sub="· macro data">
      {ECON.map(d=>(
        <Row key={d.label} hover={false}>
          <div style={{flex:1,fontSize:10,color:T.grey400}}>{d.label}</div>
          <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono,marginRight:6}}>{d.val}</div>
          <div style={{fontSize:9,color:T.grey600,marginRight:6,fontFamily:T.mono}}>{d.prev}</div>
          {d.beat!=null && <Badge label={d.beat?"BEAT":"MISS"} color={d.beat?T.green:T.red}/>}
          <span style={{fontSize:10,color:d.up?T.green:T.red,marginLeft:4}}>{d.up?"▲":"▼"}</span>
        </Row>
      ))}
    </Panel>
  );
}
);

// -- NEW PANELS

export const OptionsFlowPanel = memo(function OptionsFlowPanel() {
  return (
    <Panel title="Unusual Options Flow" right={<Badge label="LIVE" color="#a855f7"/>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",
        padding:"5px 14px 4px",borderBottom:`1px solid ${T.border}`}}>
        {["TICKER","SIDE","STRIKE/EXP","NOTIONAL","VOL"].map(h=>(
          <div key={h} style={{fontSize:8,color:T.grey600,fontFamily:T.mono,letterSpacing:"0.05em"}}>{h}</div>
        ))}
      </div>
      {OPTIONS_FLOW.map((o,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",
          padding:"6px 14px",borderBottom:`1px solid ${T.border}`,alignItems:"center",
          background:o.unusual?`${"#a855f7"}08`:"transparent",cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.background=T.surface}
          onMouseLeave={e=>e.currentTarget.style.background=o.unusual?"#a855f708":"transparent"}>
          <div>
            <span style={{fontSize:11,fontWeight:800,color:T.white,fontFamily:T.mono}}>{o.ticker}</span>
            {o.unusual&&<span style={{marginLeft:4,fontSize:7,color:"#a855f7",fontFamily:T.mono}}> !</span>}
          </div>
          <span style={{fontSize:9,fontWeight:700,color:o.type==="CALLS"?T.green:T.red,fontFamily:T.mono}}>
            {o.type} <span style={{color:T.grey600,fontWeight:400}}>{o.side}</span>
          </span>
          <span style={{fontSize:9,color:T.grey400,fontFamily:T.mono}}>{o.strike} / {o.exp}</span>
          <span style={{fontSize:10,fontWeight:700,color:T.white,fontFamily:T.mono}}>{o.notional}</span>
          <span style={{fontSize:10,color:T.amber,fontFamily:T.mono,fontWeight:700}}>{o.vol}</span>
        </div>
      ))}
    </Panel>
  );
}
);

export const MacroCalendarPanel = memo(function MacroCalendarPanel() {
  return (
    <Panel title="Macro Calendar" sub="· upcoming events" right={<Badge label="TODAY" color={T.blue}/>}>
      {MACRO_CALENDAR.map((e,i)=>{
        const hasActual = e.actual!=null;
        const beat = hasActual && parseFloat(e.actual) > parseFloat(e.est);
        return (
          <div key={i} style={{padding:"7px 14px",borderBottom:`1px solid ${T.border}`,
            background:e.impact==="HIGH"&&!hasActual?`${T.blue}06`:"transparent"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
              <span style={{fontSize:9,color:T.grey600,fontFamily:T.mono,minWidth:50}}>{e.time}</span>
              <Badge label={e.impact} color={e.impact==="HIGH"?T.red:e.impact==="MED"?T.amber:T.grey400}/>
              <span style={{fontSize:10,fontWeight:600,color:T.white,flex:1}}>{e.name}</span>
              {hasActual&&<Badge label={e.surprise==="above"?"BEAT":"MISS"} color={e.surprise==="above"?T.green:T.red}/>}
            </div>
            <div style={{display:"flex",gap:16,paddingLeft:56}}>
              {e.prev&&<div style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>Prev: <span style={{color:T.grey400}}>{e.prev}</span></div>}
              {e.est&&<div style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>Est: <span style={{color:T.grey400}}>{e.est}</span></div>}
              {hasActual&&<div style={{fontSize:9,fontWeight:700,fontFamily:T.mono,color:beat?T.green:T.red}}>Act: {e.actual}</div>}
            </div>
          </div>
        );
      })}
    </Panel>
  );
}
);

export const VolatilityPanel = memo(function VolatilityPanel() {
  const fg = parseInt(VOLATILITY.find(v=>v.label==="Fear & Greed")?.val||50);
  const fgColor = fg>75?T.red:fg>55?T.amber:fg>45?T.grey400:fg>25?T.green:"#22c55e";
  return (
    <Panel title="Volatility & Sentiment" right={<Badge label="DERIVATIVES" color={T.grey400}/>}>
      {/* Fear & Greed gauge */}
      <div style={{padding:"8px 14px 6px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
          <span style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>FEAR {"&"} GREED INDEX</span>
          <span style={{fontSize:16,fontWeight:800,color:fgColor,fontFamily:T.mono}}>{fg}</span>
        </div>
        <div style={{height:6,background:T.grey800,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${fg}%`,
            background:`linear-gradient(90deg,${T.green},${T.amber},${T.red})`,borderRadius:3}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
          {["FEAR","NEUTRAL","GREED"].map(l=>(
            <span key={l} style={{fontSize:7.5,color:T.grey600,fontFamily:T.mono}}>{l}</span>
          ))}
        </div>
      </div>
      {VOLATILITY.filter(v=>v.label!=="Fear & Greed").map((v,i)=>(
        <Row key={i} hover={false}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:T.grey400}}>{v.label}</div>
            <div style={{fontSize:8.5,color:T.grey600,fontFamily:T.mono,marginTop:1}}>{v.note}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono}}>{v.val}</div>
            <div style={{fontSize:9,color:v.pos?T.red:T.green}}>{v.chg}</div>
          </div>
        </Row>
      ))}
    </Panel>
  );
}
);

export const InsiderPanel = memo(function InsiderPanel() {
  return (
    <Panel title="Insider Trading" sub="· Form 4 tracker" right={<Badge label="SEC" color={T.amber}/>}>
      {INSIDER.map((ins,i)=>(
        <div key={i} style={{padding:"7px 14px",borderBottom:`1px solid ${T.border}`,
          background:ins.type==="BUY"?`${T.green}06`:`${T.red}06`}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontSize:11,fontWeight:800,color:T.white,fontFamily:T.mono,minWidth:38}}>{ins.ticker}</span>
            <Badge label={ins.type} color={ins.type==="BUY"?T.green:T.red}/>
            <Badge label={ins.signal} color={ins.signal==="STRONG"?T.green:ins.signal==="PLANNED"?T.grey400:T.amber}/>
            <span style={{marginLeft:"auto",fontSize:9,color:T.grey600,fontFamily:T.mono}}>{ins.date}</span>
          </div>
          <div style={{display:"flex",gap:12}}>
            <span style={{fontSize:9,color:T.grey600}}>{ins.name}</span>
            <span style={{fontSize:10,fontWeight:700,color:T.white,fontFamily:T.mono,marginLeft:"auto"}}>{ins.val}</span>
            <span style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>{ins.shares} sh</span>
          </div>
        </div>
      ))}
    </Panel>
  );
}
);

export const EarningsRadarPanel = memo(function EarningsRadarPanel() {
  return (
    <Panel title="Earnings Radar" sub="· upcoming" right={<Badge label="WHISPER" color={T.amber}/>}>
      {EARNINGS_RADAR.map((e,i)=>(
        <div key={i} style={{padding:"7px 14px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
            <span style={{fontSize:11,fontWeight:800,color:T.white,fontFamily:T.mono,minWidth:40}}>{e.ticker}</span>
            <span style={{fontSize:9,color:T.grey600}}>{e.name}</span>
            <Badge label={e.date} color={T.blue}/>
            <Badge label={e.rating} color={e.rating==="BUY"?T.green:T.amber}/>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>EPS Est</div>
              <div style={{fontSize:10,fontWeight:700,color:T.white,fontFamily:T.mono}}>{e.eps_est}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>EPS Prev</div>
              <div style={{fontSize:10,color:T.grey400,fontFamily:T.mono}}>{e.eps_prev}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>Rev Est</div>
              <div style={{fontSize:10,color:T.grey400,fontFamily:T.mono}}>{e.rev_est}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>Impl. Move</div>
              <div style={{fontSize:10,fontWeight:700,color:T.amber,fontFamily:T.mono}}>{e.implied_move}</div>
            </div>
          </div>
        </div>
      ))}
    </Panel>
  );
}
);

export const DarkPoolPanel = memo(function DarkPoolPanel() {
  return (
    <Panel title="Dark Pool / Block Trades" right={<Badge label="OFF-EXCHANGE" color={T.grey400}/>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",
        padding:"5px 14px 4px",borderBottom:`1px solid ${T.border}`}}>
        {["TICKER","SIDE","SHARES","NOTIONAL","VENUE"].map(h=>(
          <div key={h} style={{fontSize:8,color:T.grey600,fontFamily:T.mono,letterSpacing:"0.05em"}}>{h}</div>
        ))}
      </div>
      {DARKPOOL.map((d,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",
          padding:"6px 14px",borderBottom:`1px solid ${T.border}`,alignItems:"center",
          background:d.unusual?`${T.blue}06`:"transparent",cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.background=T.surface}
          onMouseLeave={e=>e.currentTarget.style.background=d.unusual?`${T.blue}06`:"transparent"}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:11,fontWeight:800,color:T.white,fontFamily:T.mono}}>{d.ticker}</span>
            {d.unusual&&<span style={{fontSize:7,color:T.blue}}>!</span>}
          </div>
          <Badge label={d.side} color={d.side==="BUY"?T.green:T.red}/>
          <span style={{fontSize:9,color:T.grey400,fontFamily:T.mono}}>{d.shares}</span>
          <span style={{fontSize:10,fontWeight:700,color:T.white,fontFamily:T.mono}}>{d.notional}</span>
          <span style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>{d.exchange} {d.time}</span>
        </div>
      ))}
    </Panel>
  );
}
);

export const GeopoliticalPanel = memo(function GeopoliticalPanel() {
  return (
    <Panel title="Geopolitical Risk Monitor" right={<Badge label="INTEL" color={T.red}/>}>
      {GEOPOLITICAL.map((g,i)=>(
        <div key={i} style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`,
          background:g.impact==="HIGH"?`${T.red}06`:"transparent"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
            <Badge label={g.impact} color={g.impact==="HIGH"?T.red:g.impact==="MED"?T.amber:T.grey400}/>
            <span style={{fontSize:10,fontWeight:600,color:T.white}}>{g.region}</span>
            <div style={{marginLeft:"auto",display:"flex",gap:4}}>
              {g.assets.split(",").map(a=>(
                <Badge key={a} label={a} color={T.grey600}/>
              ))}
              <span style={{fontSize:9,fontWeight:700,color:parseFloat(g.change)>0?T.red:T.green,
                fontFamily:T.mono}}>{g.change}</span>
            </div>
          </div>
          <div style={{fontSize:10,color:T.grey400,lineHeight:1.45,paddingLeft:0}}>{g.event}</div>
        </div>
      ))}
    </Panel>
  );
}
);



