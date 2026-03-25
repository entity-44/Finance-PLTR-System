import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
/// <reference types="react/next" />
import { T, Panel, Badge, LiveDot, SectionHeader, riskColor } from '@/theme';
import * as D from '@/data';
import WorldMap from '@/WorldMap';

import {
  MarketsPanel, NewsPanel, AlertsPanel, SECPanel, CommoditiesPanel, ForexPanel,
  CryptoPanel, FixedIncomePanel, CentralBanksPanel, BankingPanel, SectorPanel,
  IpoMaPanel, EconPanel, OptionsFlowPanel, MacroCalendarPanel, VolatilityPanel,
  InsiderPanel, EarningsRadarPanel, DarkPoolPanel, GeopoliticalPanel,
  ETFPanel, BondCreditPanel,
} from '@/panels1';

import { SP500HeatmapPanel, HistoricalPerformancePanel, WatchlistPanel, ETFPanel, BondCreditPanel } from '@/panels2';
import { FedFuturesPanel, ShortInterestPanel, MarketBreadthPanel } from '@/panels3';

const {
  MARKETS, FOREX, CRYPTO, ALERTS_DATA,
  COMMODITIES, FILINGS, NEWS, BANKS, FIN_NODES, COUNTRY_DATA,
} = D;


// Searchable items pool
const SEARCH_POOL = [
  ...MARKETS.map(m=>({type:"MARKET",   label:m.name,              val:m.val,  chg:m.chg,  pos:m.pos})),
  ...FOREX.map(f=>  ({type:"FX",       label:f.pair,              val:f.val,  chg:f.chg,  pos:f.pos})),
  ...CRYPTO.map(c=> ({type:"CRYPTO",   label:c.sym,               val:c.val,  chg:c.chg,  pos:c.pos})),
  ...COMMODITIES.map(c=>({type:"COMMODITY",label:c.name,          val:c.val,  chg:c.chg,  pos:c.pos})),
  ...FILINGS.map(f=>({type:"FILING",   label:f.ticker+" · "+f.co.slice(0,18), val:f.type, chg:f.time, pos:true})),
  ...NEWS.map(n=>   ({type:"NEWS",     label:n.title.slice(0,30)+"...",val:n.src,chg:n.time,  pos:true})),
  ...BANKS.map(b=>  ({type:"BANK",     label:b.ticker+" · "+b.name, val:b.price,chg:b.chg, pos:b.pos})),
  ...Object.values({US:"United States",CN:"China",DE:"Germany",JP:"Japan",GB:"UK",FR:"France",
    IN:"India",CA:"Canada",BR:"Brazil",AU:"Australia",RU:"Russia",TR:"Turkey",NG:"Nigeria",
    ZA:"South Africa",SA:"Saudi Arabia",KR:"South Korea",AR:"Argentina",ID:"Indonesia"})
    .map((name,i)=>({type:"COUNTRY", label:name, val:"INTELLIGENCE", chg:"CLICK TO VIEW", pos:true})),
];


// -- APP 

export default function App() {
  const [time,setTime]=useState(new Date());
  const [popup,setPopup]=useState(null);
  const [activeTab,setActiveTab]=useState("ALL");
  const [bellOpen,setBellOpen]=useState(false);
  const [bellDismissed,setBellDismissed]=useState(new Set());
  const [searchQ,setSearchQ]=useState("");
  const [searchOpen,setSearchOpen]=useState(false);
  const bellRef=useRef(null);
  const searchRef=useRef(null);

  useEffect(()=>{
    const t=setInterval(()=>setTime(new Date()),1000);
    return ()=>clearInterval(t);
  },[]);
  useEffect(()=>{
    const t=setTimeout(()=>setPopup(ALERTS_DATA[2]),2000);
    return ()=>clearTimeout(t);
  },[]);
  useEffect(()=>{
    const handler=(e)=>{
      if(bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if(searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown",handler);
    return ()=>document.removeEventListener("mousedown",handler);
  },[]);

  const fmt=d=>d.toLocaleTimeString("en-US",{hour12:false});
  const tabs=["ALL","MARKETS","MACRO","FILINGS","BANKING","CRYPTO"];
  const unreadCount=ALERTS_DATA.filter(a=>!bellDismissed.has(a.id)).length;
  const searchResults=searchQ.length>1
    ? SEARCH_POOL.filter(s=>s.label.toLowerCase().includes(searchQ.toLowerCase())).slice(0,7)
    : [];
  const sevColor=s=>s==="high"?T.red:s==="medium"?T.amber:"#3b82f6";
  const typeColor=t=>({MARKET:"#3b82f6",FX:"#8b5cf6",CRYPTO:"#f59e0b",COMMODITY:"#f97316",
    FILING:"#22c55e",NEWS:"#6b7280",BANK:"#ec4899",COUNTRY:"#00c8f0"})[t]||T.grey400;

  return (
    <div style={{fontFamily:T.sans,background:T.bg,minHeight:"100vh",color:T.grey200,overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:#000}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
        @keyframes livePulse{0%,100%{transform:scale(1);opacity:0.4}60%{transform:scale(2.8);opacity:0}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes slideInRight{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        button,input{font-family:inherit}
        .bell-btn:hover{background:#1a1a1a!important}
        .sr-item:hover{background:#161616!important;cursor:pointer}
        .alert-item:hover{background:#141414!important}
      `}</style>

      {/* NAV */}
      <nav style={{height:46,background:"#000",borderBottom:`1px solid ${T.border}`,
        display:"flex",alignItems:"center",padding:"0 16px",
        position:"sticky",top:0,zIndex:200,gap:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:20}}>
          <div style={{width:26,height:26,borderRadius:5,background:T.white,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:13,fontWeight:900,color:"#000",flexShrink:0}}>F</div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:T.white,letterSpacing:"0.08em",lineHeight:1.1}}>FINTEL</div>
            <div style={{fontSize:8,color:T.grey600,letterSpacing:"0.2em"}}>COMMAND</div>
          </div>
        </div>
        <div style={{width:1,height:20,background:T.border,marginRight:16}}/>
        {tabs.map(tab=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{
            background:"none",border:"none",
            borderBottom:activeTab===tab?`2px solid ${T.white}`:"2px solid transparent",
            color:activeTab===tab?T.white:T.grey600,
            padding:"0 13px",height:46,cursor:"pointer",
            fontSize:10,fontWeight:600,letterSpacing:"0.08em",
            transition:"all 0.12s",fontFamily:T.mono}}>
            {tab}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>

          {/*  SEARCH  */}
          <div ref={searchRef} style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,
              background:searchOpen||searchQ?T.surface:"#0a0a0a",
              border:`1px solid ${searchOpen||searchQ?T.borderHi:T.border}`,
              borderRadius:4,padding:"5px 11px",transition:"all 0.15s"}}>
              <span style={{fontSize:12,color:searchQ?T.grey200:T.grey600}}>⌕</span>
              <input
                value={searchQ}
                onChange={e=>{ setSearchQ(e.target.value); setSearchOpen(true); }}
                onFocus={()=>setSearchOpen(true)}
                placeholder="Ticker, event, filing…"
                style={{background:"none",border:"none",outline:"none",
                  color:T.grey200,fontSize:11,width:170}}/>
              {searchQ && (
                <button onClick={()=>{setSearchQ("");setSearchOpen(false);}} style={{
                  background:"none",border:"none",color:T.grey600,cursor:"pointer",
                  fontSize:12,padding:0,lineHeight:1}}>×</button>
              )}
            </div>
            {/* Search results dropdown */}
            {searchOpen && searchQ.length>1 && (
              <div style={{
                position:"absolute",top:"calc(100% + 6px)",right:0,
                width:320,background:"#0a0a0a",
                border:`1px solid ${T.border}`,borderRadius:4,
                boxShadow:"0 8px 32px rgba(0,0,0,0.8)",
                zIndex:300,overflow:"hidden",
                animation:"fadeIn 0.15s ease-out",
              }}>
                {searchResults.length===0 ? (
                  <div style={{padding:"14px 14px",fontSize:11,color:T.grey600,fontFamily:T.mono,textAlign:"center"}}>
                    No results for "{searchQ}"
                  </div>
                ) : (<>
                  <div style={{padding:"6px 12px 4px",fontSize:8,color:T.grey600,
                    fontFamily:T.mono,letterSpacing:"0.1em",borderBottom:`1px solid ${T.border}`}}>
                    {searchResults.length} RESULT{searchResults.length!==1?"S":""}
                  </div>
                  {searchResults.map((r,i)=>(
                    <div key={i} className="sr-item" style={{
                      display:"flex",alignItems:"center",gap:10,
                      padding:"8px 12px",borderBottom:`1px solid ${T.border}`,
                      transition:"background 0.1s",
                    }}>
                      <span style={{
                        fontSize:8,fontWeight:700,fontFamily:T.mono,
                        color:typeColor(r.type),
                        background:typeColor(r.type)+"18",
                        padding:"2px 5px",borderRadius:2,flexShrink:0,
                        minWidth:56,textAlign:"center",letterSpacing:"0.04em"
                      }}>{r.type}</span>
                      <span style={{flex:1,fontSize:11,color:T.grey200,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.label}</span>
                      <span style={{fontSize:10,fontFamily:T.mono,color:T.white,flexShrink:0}}>{r.val}</span>
                      <span style={{fontSize:10,fontFamily:T.mono,color:r.pos?T.green:T.red,
                        flexShrink:0}}>{r.chg}</span>
                    </div>
                  ))}
                  <div style={{padding:"6px 12px",fontSize:8,color:T.grey600,fontFamily:T.mono,
                    textAlign:"center"}}>
                    PRESS ENTER TO SEARCH ALL
                  </div>
                </>)}
              </div>
            )}
          </div>

          {/*  BELL  */}
          <div ref={bellRef} style={{position:"relative"}}>
            <button className="bell-btn" onClick={()=>setBellOpen(o=>!o)} style={{
              position:"relative",background:bellOpen?"#1a1a1a":"none",
              border:`1px solid ${bellOpen?T.border:"transparent"}`,
              borderRadius:4,cursor:"pointer",width:34,height:34,
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all 0.15s"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={unreadCount>0?T.amber:T.grey400} strokeWidth="2" strokeLinecap="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={unreadCount>0?T.amber:T.grey400} strokeWidth="2" strokeLinecap="round"/>
                {unreadCount>0 && <circle cx="18" cy="5" r="5" fill={T.amber}/>}
              </svg>
              {unreadCount>0 && (
                <span style={{position:"absolute",top:2,right:2,width:14,height:14,
                  borderRadius:"50%",background:T.amber,fontSize:7,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",pointerEvents:"none"}}>{unreadCount}</span>
              )}
            </button>

            {/* Notifications panel */}
            {bellOpen && (
              <div style={{
                position:"absolute",top:"calc(100% + 8px)",right:0,
                width:340,background:"#0a0a0a",
                border:`1px solid ${T.border}`,borderRadius:4,
                boxShadow:"0 8px 32px rgba(0,0,0,0.85)",
                zIndex:300,overflow:"hidden",
                animation:"fadeIn 0.15s ease-out",
              }}>
                {/* Header */}
                <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,
                  display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,fontWeight:700,color:T.white,
                      fontFamily:T.mono,letterSpacing:"0.06em"}}>ALERTS</span>
                    {unreadCount>0 && (
                      <span style={{background:T.red,color:"#fff",fontSize:8,fontWeight:800,
                        padding:"1px 5px",borderRadius:10,fontFamily:T.mono}}>{unreadCount} NEW</span>
                    )}
                  </div>
                  {unreadCount>0 && (
                    <button onClick={()=>setBellDismissed(new Set(ALERTS_DATA.map(a=>a.id)))}
                      style={{background:"none",border:`1px solid ${T.border}`,
                        color:T.grey600,fontSize:9,padding:"2px 7px",borderRadius:3,
                        cursor:"pointer",fontFamily:T.mono,letterSpacing:"0.06em"}}>
                      MARK ALL READ
                    </button>
                  )}
                </div>

                {/* Alert items */}
                {ALERTS_DATA.map(a=>{
                  const read=bellDismissed.has(a.id);
                  return(
                    <div key={a.id} className="alert-item" style={{
                      padding:"10px 14px",borderBottom:`1px solid ${T.border}`,
                      display:"flex",gap:10,alignItems:"flex-start",
                      background:read?"transparent":"#0d0d0d",
                      transition:"background 0.15s",
                    }}>
                      {/* Unread dot */}
                      <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,marginTop:4,
                        background:read?"transparent":sevColor(a.sev),
                        boxShadow:read?"none":`0 0 6px ${sevColor(a.sev)}80`}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                          <span style={{fontSize:8,fontWeight:700,color:sevColor(a.sev),
                            fontFamily:T.mono,letterSpacing:"0.06em",
                            background:sevColor(a.sev)+"20",padding:"1px 5px",borderRadius:2}}>
                            {a.sev.toUpperCase()}
                          </span>
                          <span style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>{a.type}</span>
                          <span style={{fontSize:8,color:T.grey600,fontFamily:T.mono,marginLeft:"auto"}}>{a.time}</span>
                        </div>
                        <div style={{fontSize:11,color:read?T.grey600:T.grey200,lineHeight:1.4}}>{a.msg}</div>
                      </div>
                      <button onClick={()=>setBellDismissed(d=>new Set([...d,a.id]))}
                        style={{background:"none",border:"none",color:T.grey700,cursor:"pointer",
                          fontSize:14,padding:0,flexShrink:0,lineHeight:1,marginTop:-1}}>×</button>
                    </div>
                  );
                })}

                {/* Footer */}
                <div style={{padding:"8px 14px",display:"flex",justifyContent:"center"}}>
                  <span style={{fontSize:9,color:T.grey600,fontFamily:T.mono,letterSpacing:"0.06em"}}>
                    {unreadCount===0?"ALL CAUGHT UP · NO UNREAD ALERTS":`${unreadCount} UNREAD ALERT${unreadCount!==1?"S":""}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Clock */}
          <div style={{textAlign:"right",borderLeft:`1px solid ${T.border}`,paddingLeft:12}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:T.mono,color:T.white,letterSpacing:"0.04em"}}>{fmt(time)}</div>
            <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>UTC-5 · NYSE OPEN</div>
          </div>
        </div>
      </nav>
      {/* TICKER */}
      <div style={{height:28,background:T.surface,borderBottom:`1px solid ${T.border}`,
        overflow:"hidden",display:"flex",alignItems:"center"}}>
        <div style={{display:"flex",gap:0,animation:"ticker 55s linear infinite",
          whiteSpace:"nowrap",willChange:"transform"}}>
          {[...MARKETS,...FOREX.slice(0,3),...CRYPTO.slice(0,2),
            ...MARKETS,...FOREX.slice(0,3),...CRYPTO.slice(0,2)].map((m,i)=>(
            <span key={i} style={{fontSize:10,padding:"0 16px",borderRight:`1px solid ${T.border}`,
              fontFamily:T.mono,display:"inline-flex",alignItems:"center",gap:7}}>
              <span style={{color:T.grey600}}>{(m as any).name||(m as any).pair||(m as any).sym}</span>
              <span style={{color:T.white}}>{m.val}</span>
              <span style={{color:m.pos?T.green:T.red}}>{m.chg}</span>
            </span>
          ))}
        </div>
      </div>

      {/* MAP */}
      <div style={{height:420,borderBottom:`1px solid ${T.border}`,position:"relative"}}>
        <WorldMap/>
      </div>

      {/* DIGEST */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,
        padding:"8px 16px",display:"flex",alignItems:"center",gap:12}}>
        <Badge label="MORNING BRIEF" color={T.amber}/>
        <span style={{fontSize:10,color:T.grey400,lineHeight:1.5}}>
          Equities open higher led by tech (+1.1%). Treasury yields up 2–3bps on hot CPI.
          Oil climbing on supply concerns. Fed signals patience. Regional banks lag on CRE exposure.
        </span>
        <span style={{marginLeft:"auto",fontSize:9,color:T.grey600,whiteSpace:"nowrap",fontFamily:T.mono}}>09:00 EST</span>
      </div>

      {/* GRID - ordered by intelligence priority */}
      <div style={{padding:"10px 12px 24px",display:"grid",gap:10,
        gridTemplateColumns:"repeat(3,1fr)"}}>

        {/* 1. ALERTS & NEWS — highest urgency, always first */}
        {/* ── 1. LIVE ALERTS & NEWS ─────────────────────────────────────
             First thing a trader checks. Urgent, time-sensitive.        */}
        <SectionHeader label="LIVE ALERTS & INTELLIGENCE"/>
        <AlertsPanel/>
        <div style={{gridColumn:"span 2"}}><NewsPanel/></div>

        {/* ── 2. MACRO CALENDAR + ECON + CENTRAL BANKS ─────────────────
             What is moving markets TODAY. Drives everything below it.   */}
        <SectionHeader label="MACRO & ECONOMIC DATA"/>
        <MacroCalendarPanel/>
        <EconPanel/>
        <CentralBanksPanel/>
        <div style={{gridColumn:"span 2"}}><FedFuturesPanel/></div>
        <MarketBreadthPanel/>

        {/* ── 3. WATCHLIST + GLOBAL INDICES ─────────────────────────────
             Your stocks and the benchmark context around them.           */}
        <SectionHeader label="WATCHLIST & GLOBAL MARKETS"/>
        <div style={{gridColumn:"span 2"}}><WatchlistPanel/></div>
        <MarketsPanel/>

        {/* ── 4. FIXED INCOME + BOND CREDIT RATINGS ─────────────────────
             Rates are the anchor of all asset valuations. Check early.  */}
        <SectionHeader label="FIXED INCOME & CREDIT"/>
        <FixedIncomePanel/>
        <div style={{gridColumn:"span 2"}}><BondCreditPanel/></div>

        {/* ── 5. VOLATILITY + OPTIONS FLOW + DARK POOL ──────────────────
             Risk environment + where smart/institutional money is going. */}
        <SectionHeader label="RISK SIGNALS & SMART MONEY"/>
        <VolatilityPanel/>
        <OptionsFlowPanel/>
        <DarkPoolPanel/>
        <div style={{gridColumn:"span 2"}}><ShortInterestPanel/></div>
        <InsiderPanel/>

        {/* ── 6. S&P 500 HEATMAP ────────────────────────────────────────
             Full market internals — where is the money flowing now.     */}
        <SectionHeader label="S&P 500 MARKET INTERNALS"/>
        <div style={{gridColumn:"span 3"}}><SP500HeatmapPanel/></div>

        {/* ── 7. SECTOR HEATMAP ─────────────────────────────────────────
             Sector-level breadth and rotation view.                     */}
        <div style={{gridColumn:"span 3"}}><SectorPanel/></div>

        {/* ── 8. EARNINGS + INSIDER + SEC ───────────────────────────────
             Corporate event-driven alpha opportunities.                  */}
        <SectionHeader label="CORPORATE INTELLIGENCE"/>
        <EarningsRadarPanel/>
        <div style={{gridColumn:"span 2"}}><SECPanel/></div>

        {/* ── 9. ETFs + COMMODITIES + FX + CRYPTO ───────────────────────
             Cross-asset view for hedging, diversification, macro plays. */}
        <SectionHeader label="CROSS-ASSET & ALTERNATIVES"/>
        <div style={{gridColumn:"span 3"}}><ETFPanel/></div>
        <CommoditiesPanel/>
        <ForexPanel/>
        <CryptoPanel/>

        {/* ── 10. HISTORICAL PERFORMANCE ────────────────────────────────
             Long-term context. Less urgent, useful for perspective.     */}
        <SectionHeader label="HISTORICAL PERFORMANCE"/>
        <div style={{gridColumn:"span 3"}}><HistoricalPerformancePanel/></div>

        {/* ── 11. DEAL FLOW + GEOPOLITICAL ──────────────────────────────
             Background macro risk and capital markets activity.         */}
        <SectionHeader label="DEAL FLOW & GEOPOLITICAL RISK"/>
        <IpoMaPanel/>
        <div style={{gridColumn:"span 2"}}><GeopoliticalPanel/></div>

        {/* ── 12. SYSTEMIC RISK - BANKING ───────────────────────────────
             Macro systemic risk. Always last — slow moving signal.     */}
        <SectionHeader label="SYSTEMIC RISK - BANKING"/>
        <div style={{gridColumn:"span 3"}}><BankingPanel/></div>

      </div>

      {/* POPUP */}
      {popup&&(
        <div style={{position:"fixed",top:58,right:16,zIndex:999,
          background:"#0a0a0a",border:`1px solid ${T.border}`,
          borderLeft:`3px solid ${T.red}`,borderRadius:5,
          padding:"14px 16px",maxWidth:360,
          boxShadow:"0 8px 40px rgba(0,0,0,0.9),0 0 0 1px #1a1a1a",
          animation:"slideInRight 0.25s ease-out"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <LiveDot size={7} color={T.red}/>
            <span style={{fontSize:10,fontWeight:700,color:T.red,
              letterSpacing:"0.1em",fontFamily:T.mono}}>HIGH PRIORITY</span>
            <button onClick={()=>setPopup(null)} style={{marginLeft:"auto",background:"none",
              border:"none",color:T.grey600,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
          </div>
          <div style={{fontSize:12,color:T.white,lineHeight:1.5,marginBottom:8}}>{popup.msg}</div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <Badge label={popup.type} color={T.red}/>
            <span style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>{popup.time} EST</span>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{borderTop:`1px solid ${T.border}`,padding:"8px 16px",
        display:"flex",alignItems:"center",gap:10,background:T.surface}}>
        <LiveDot size={5} color={T.green}/>
        <span style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>
          FINTEL v4.0 · 21 PANELS · ALL SYSTEMS NOMINAL
        </span>
        <span style={{marginLeft:"auto",fontSize:9,color:T.grey600}}>
          Live APIs ready: FRED · SEC EDGAR · Polygon.io · CoinGecko · ExchangeRate-API
        </span>
      </footer>
    </div>
  );
}

