import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { T, LiveDot, Badge, riskColor, riskLabel } from '@/theme';
import { COUNTRY_DATA, FIN_NODES, FLOW_PAIRS, CABLES, PIPELINES } from '@/data';
import type { CountryIntel, FinancialNode } from '@/types';

declare global {
  interface Window {
    maplibregl: any;
  }
}


const PROTOMAPS_API_KEY = "bf6e47d323bd141e";

function WorldMap() {
  const mapDivRef    = useRef(null);
  const mapRef       = useRef(null);
  const containerRef = useRef(null);
  const markersRef   = useRef([]);
  const [layers,   setLayers]   = useState({nodes:true,flows:true,cables:true,pipes:true});
  const [tooltip,  setTooltip]  = useState(null);
  const [ttPos,    setTtPos]    = useState({x:0,y:0});
  const [now,      setNow]      = useState(new Date());
  const [mapState, setMapState] = useState("loading");

  useEffect(()=>{
    const id=setInterval(()=>setNow(new Date()),1000);
    return ()=>clearInterval(id);
  },[]);

  // Inject a script tag into document head, return promise
  function loadScript(src) {
    return new Promise<void>((res,rej)=>{
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement("script");
      s.src=src; s.async=true;
      s.onload=res; s.onerror=()=>rej(new Error("Failed to load "+src));
      document.head.appendChild(s);
    });
  }
  function loadCSS(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l=document.createElement("link");
    l.rel="stylesheet"; l.href=href;
    document.head.appendChild(l);
  }

  useEffect(()=>{
    let cancelled=false;

    async function init() {
      try {
        // MapLibre GL JS - the renderer used by the reference screenshot (shows WEBGL badge)
        loadCSS("https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css");
        await loadScript("https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js");
        if (cancelled||!mapDivRef.current||mapRef.current) return;

        const L = window.maplibregl;

        const map = new L.Map({
          container: mapDivRef.current,
          // Protomaps Hosted API - Style JSON (dark theme, English labels)
          // From: protomaps.com/api - Style JSON, Dark theme
          style: `https://api.protomaps.com/styles/v5/dark/en.json?key=${PROTOMAPS_API_KEY}`,
          center: [15, 20],
          zoom: 1.8,
          minZoom: 1.5,
          maxZoom: 8,
          attributionControl: true,
          antialias: true,
        });
        mapRef.current = map;

        const NODE_CTR = {
          nyc:"United States",tor:"Canada",lon:"United Kingdom",fra:"Germany",
          zur:"Switzerland",dxb:"United Arab Emirates",mum:"India",sha:"China",
          hkg:"China",tok:"Japan",sgp:"Singapore",syd:"Australia",sao:"Brazil",joh:"South Africa"
        };

        map.on("load", ()=>{
          if (cancelled) return;

          // Country border glow on top of Protomaps style
          map.addLayer({
            id:"country-border-glow",
            type:"line",
            source:"protomaps",
            "source-layer":"boundaries",
            filter:["==",["get","kind"],"country"],
            paint:{
              "line-color":"#ffffff",
              "line-width":3,
              "line-opacity":0.07,
              "line-blur":4,
            }
          });
          map.addLayer({
            id:"country-border-inner",
            type:"line",
            source:"protomaps",
            "source-layer":"boundaries",
            filter:["==",["get","kind"],"country"],
            paint:{
              "line-color":"#7ab8d4",
              "line-width":0.8,
              "line-opacity":0.55,
            }
          });

          // Capital flows
          map.addSource("flows",{type:"geojson",data:{type:"FeatureCollection",
            features:FLOW_PAIRS.map(([a,b])=>{
              const na=FIN_NODES.find(n=>n.id===a), nb=FIN_NODES.find(n=>n.id===b);
              if(!na||!nb) return null;
              return {type:"Feature",geometry:{type:"LineString",coordinates:[[na.lon,na.lat],[nb.lon,nb.lat]]},properties:{}};
            }).filter(Boolean)
          }});
          map.addLayer({id:"flows-line",type:"line",source:"flows",
            paint:{"line-color":"#22c55e","line-width":1.2,"line-opacity":0.45,"line-dasharray":[3,8]}
          });

          // Undersea cables
          map.addSource("cables",{type:"geojson",data:{type:"FeatureCollection",
            features:CABLES.map(c=>({type:"Feature",
              geometry:{type:"LineString",coordinates:c.pts.map(([lo,la])=>[lo,la])},
              properties:{color:c.color}
            }))
          }});
          map.addLayer({id:"cables-line",type:"line",source:"cables",
            paint:{"line-color":["get","color"],"line-width":1,"line-opacity":0.55,"line-dasharray":[2,10]}
          });

          // Pipelines
          map.addSource("pipes",{type:"geojson",data:{type:"FeatureCollection",
            features:PIPELINES.map(p=>({type:"Feature",
              geometry:{type:"LineString",coordinates:p.pts.map(([lo,la])=>[lo,la])},
              properties:{color:p.color}
            }))
          }});
          map.addLayer({id:"pipes-line",type:"line",source:"pipes",
            paint:{"line-color":["get","color"],"line-width":2,"line-opacity":0.45,"line-dasharray":[2,5]}
          });

          // Financial node markers
          FIN_NODES.forEach(n=>{
            const color=n.perf>=0?"#22c55e":"#ef4444";
            const el=document.createElement("div");
            el.style.cssText="position:relative;width:14px;height:14px;cursor:pointer";
            el.innerHTML=`
              <div style="position:absolute;inset:0;border-radius:50%;background:${color};
                opacity:0.3;animation:finpulse 2.2s ease-out infinite;"></div>
              <div style="position:absolute;inset:3px;border-radius:50%;background:${color};
                box-shadow:0 0 10px ${color}cc,0 0 3px ${color};"></div>`;

            const lbl=document.createElement("div");
            lbl.style.cssText=`font-size:9px;font-family:monospace;color:${color};
              white-space:nowrap;pointer-events:none;text-align:center;
              text-shadow:0 0 6px #000,0 0 14px #000;letter-spacing:.03em;
              font-weight:600;margin-top:-20px;`;
            lbl.textContent=n.name;

            const marker=new L.Marker({element:el,anchor:"center"}).setLngLat([n.lon,n.lat]).addTo(map);
            const lblMkr=new L.Marker({element:lbl,anchor:"bottom"}).setLngLat([n.lon,n.lat]).addTo(map);
            markersRef.current.push(marker,lblMkr);

            el.addEventListener("click",e=>{
              e.stopPropagation();
              const country=NODE_CTR[n.id];
              const cd=COUNTRY_DATA[country];
              const rect=containerRef.current?.getBoundingClientRect();
              setTtPos({x:e.clientX-(rect?.left||0),y:e.clientY-(rect?.top||0)});
              setTooltip(cd?{...cd,name:country,node:n}:{name:country,node:n,noData:true});
            });
          });

          map.on("click",()=>setTooltip(null));
          if(!cancelled) setMapState("ready");
        });

        map.on("error",err=>{
          console.error("MapLibre/Protomaps error:",err);
          if(!cancelled) setMapState("error");
        });

      } catch(err){
        console.error("Map init failed:",err);
        if(!cancelled) setMapState("error");
      }
    }

    init();
    return ()=>{
      cancelled=true;
      markersRef.current.forEach(m=>m.remove?.());
      markersRef.current=[];
      if(mapRef.current){mapRef.current.remove();mapRef.current=null;}
    };
  },[]);

  // Sync layer toggles
  useEffect(()=>{
    const map=mapRef.current;
    if(!map||mapState!=="ready") return;
    const layerMap={flows:["flows-line"],cables:["cables-line"],pipes:["pipes-line"],nodes:[]};
    Object.entries(layers).forEach(([k,on])=>{
      (layerMap[k]||[]).forEach(id=>{
        if(map.getLayer(id)) map.setLayoutProperty(id,"visibility",on?"visible":"none");
      });
      if(k==="nodes") markersRef.current.forEach(m=>{
        if(m._element) m._element.style.display=on?"":"none";
      });
    });
  },[layers,mapState]);

  const toggle=k=>setLayers(p=>({...p,[k]:!p[k]}));

  const LAYER_DEFS=[
    {k:"nodes",label:"NODES",color:"#e2f2fc"},
    {k:"flows",label:"FLOWS",color:"#22c55e"},
    {k:"cables",label:"CABLES",color:"#8b5cf6"},
    {k:"pipes",label:"PIPES",color:"#f97316"},
  ];

  const fmt24=d=>d.toUTCString().slice(5,25).toUpperCase();

  return (
    <div ref={containerRef} style={{position:"relative",width:"100%",height:"100%",background:"#060d15",overflow:"hidden"}}>
      <style>{`
        .maplibregl-canvas{display:block}
        .maplibregl-ctrl-attrib{background:rgba(3,8,15,0.8)!important;color:#1e3a52!important;font-size:8px!important}
        .maplibregl-ctrl-attrib a{color:#2a6080!important}
        .maplibregl-ctrl-group{background:#07111c!important;border:1px solid #0e2034!important}
        .maplibregl-ctrl-group button{background:#07111c!important}
        .maplibregl-ctrl-group button:hover{background:#0d1b2a!important}
        .maplibregl-ctrl-icon{filter:invert(0.6) sepia(1) hue-rotate(160deg)}
        @keyframes finpulse{0%{transform:scale(1);opacity:.4}60%{transform:scale(2.8);opacity:0}100%{transform:scale(1);opacity:0}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      {/* Map mount point */}
      <div ref={mapDivRef} style={{width:"100%",height:"100%"}}/>

      {/* Loading / error / key-missing state */}
      {mapState!=="ready"&&(
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
          justifyContent:"center",zIndex:10,background:"#060d15",flexDirection:"column",gap:10}}>
          {PROTOMAPS_API_KEY==="YOUR_KEY_HERE"?(
            <>
              <span style={{fontSize:12,color:"#f59e0b",fontFamily:T.mono,letterSpacing:"0.1em"}}>API KEY REQUIRED</span>
              <span style={{fontSize:9,color:"#2a4a62",fontFamily:T.mono,textAlign:"center",maxWidth:300,lineHeight:1.6}}>
                Get a free key at protomaps.com/account{"\n"}then set PROTOMAPS_API_KEY at the top of WorldMap
              </span>
            </>
          ):mapState==="error"?(
            <>
              <span style={{fontSize:11,color:"#ef4444",fontFamily:T.mono,letterSpacing:"0.1em"}}>MAP UNAVAILABLE</span>
              <span style={{fontSize:9,color:"#2a4a62",fontFamily:T.mono}}>Check API key or network access</span>
            </>
          ):(
            <>
              <div style={{width:22,height:22,border:"2px solid #0e2034",
                borderTop:"2px solid #00c8f0",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              <span style={{fontSize:9,color:"#2a4a62",fontFamily:T.mono,letterSpacing:"0.12em"}}>LOADING PROTOMAPS...</span>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:500,pointerEvents:"none",
        background:"linear-gradient(180deg,rgba(2,9,18,0.96) 0%,rgba(2,9,18,0.55) 65%,transparent 100%)",
        padding:"10px 14px 22px",display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,fontWeight:700,color:"#e2f2fc",letterSpacing:"0.14em",fontFamily:T.mono}}>
              GLOBAL FINANCIAL MAP
            </span>
            <LiveDot size={6} color="#22c55e"/>
          </div>
          <span style={{fontSize:8,color:"#3a6a8a",fontFamily:T.mono,letterSpacing:"0.06em"}}>
            {fmt24(now)} UTC
          </span>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:4,pointerEvents:"all",marginTop:1}}>
          {LAYER_DEFS.map(l=>(
            <button key={l.k} onClick={()=>toggle(l.k)} style={{
              background:layers[l.k]?`${l.color}20`:"#ffffff08",
              border:`1px solid ${layers[l.k]?l.color+"55":"#ffffff14"}`,
              color:layers[l.k]?l.color:"#2a4a62",
              padding:"3px 9px",borderRadius:3,cursor:"pointer",
              fontSize:9,fontWeight:700,fontFamily:T.mono,letterSpacing:"0.06em",
              transition:"all 0.15s"
            }}>{l.label}</button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{position:"absolute",bottom:24,left:12,zIndex:500,pointerEvents:"none",
        display:"flex",gap:14,alignItems:"center",
        background:"rgba(2,9,18,0.75)",padding:"5px 10px",borderRadius:3,
        border:"1px solid #0e2034"}}>
        {[["#22c55e","FLOWS"],["#8b5cf6","CABLES"],["#f97316","PIPELINES"]].map(([c,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:14,height:2,background:c,borderRadius:1,opacity:0.8}}/>
            <span style={{fontSize:8,color:"#2a4a62",fontFamily:T.mono}}>{l}</span>
          </div>
        ))}
      </div>

      {/* Country intelligence tooltip */}
      {tooltip&&(()=>{
        const rc=riskColor(tooltip.risk||0),rl=riskLabel(tooltip.risk||0);
        const raw=containerRef.current?.getBoundingClientRect();
        const ttW=264,ttH=270;
        let tx=ttPos.x+14,ty=ttPos.y-16;
        if(raw&&tx+ttW>raw.width-8) tx=ttPos.x-ttW-10;
        if(raw&&ty+ttH>raw.height-8) ty=raw.height-ttH-28;
        if(ty<8) ty=8; if(tx<8) tx=8;
        return (
          <div style={{position:"absolute",left:tx,top:ty,width:ttW,zIndex:600,pointerEvents:"none",
            background:"#03080f",border:"1px solid #0e2034",borderTop:`2px solid ${rc}`,
            borderRadius:4,boxShadow:"0 12px 48px rgba(0,0,0,.9)",overflow:"hidden"}}>
            <div style={{padding:"8px 12px 7px",borderBottom:"1px solid #0c1d2d",background:"#040c16",
              display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#ffffff",lineHeight:1.2}}>{tooltip.name}</div>
                {tooltip.code&&<div style={{fontSize:8,color:"#2a4a62",fontFamily:T.mono,letterSpacing:"0.1em",marginTop:2}}>{tooltip.code} · COUNTRY INTELLIGENCE</div>}
              </div>
              {tooltip.risk!=null&&(
                <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                  <div style={{fontSize:20,fontWeight:800,color:rc,fontFamily:T.mono,lineHeight:1}}>{tooltip.risk}</div>
                  <div style={{fontSize:8,color:rc,fontFamily:T.mono,letterSpacing:"0.08em"}}>{rl}</div>
                </div>
              )}
            </div>
            {tooltip.noData?(
              <div style={{padding:"14px 12px",fontSize:10,color:"#2a4a62",fontFamily:T.mono,textAlign:"center"}}>No financial data available</div>
            ):(<>
              <div style={{padding:"5px 12px 4px",borderBottom:"1px solid #0c1d2d"}}>
                <div style={{fontSize:7.5,color:"#1e3a52",fontFamily:T.mono,marginBottom:3}}>FINANCIAL RISK INDEX · {tooltip.risk}/100</div>
                <div style={{height:3,background:"#0c1d2d",borderRadius:2}}>
                  <div style={{height:"100%",width:`${tooltip.risk}%`,background:`linear-gradient(90deg,#10b981,${rc})`,borderRadius:2}}/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #0c1d2d"}}>
                {[["GDP",tooltip.gdp,"#ffffff"],["GROWTH",tooltip.gdpGrowth,tooltip.gdpGrowth?.startsWith("+")?T.green:T.red],
                  ["INFLATION",tooltip.inflation,"#ffffff"],["RATE",tooltip.rate,"#ffffff"],
                  ["DEBT/GDP",tooltip.debt,"#ffffff"],["RATING",tooltip.rating,["AAA","AA+","AA","A+","A"].includes(tooltip.rating)?T.green:tooltip.rating?.startsWith("B")?T.amber:T.red],
                ].map(([k,v,vc],i)=>(
                  <div key={k} style={{padding:"5px 12px",borderBottom:i<4?"1px solid #0c1d2d":"none",borderRight:i%2===0?"1px solid #0c1d2d":"none"}}>
                    <div style={{fontSize:7.5,color:"#1e3a52",fontFamily:T.mono,letterSpacing:"0.06em",marginBottom:1}}>{k}</div>
                    <div style={{fontSize:11,fontWeight:700,color:vc,fontFamily:T.mono}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:"5px 12px",borderBottom:"1px solid #0c1d2d",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:7.5,color:"#1e3a52",fontFamily:T.mono}}>{tooltip.index}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#ffffff",fontFamily:T.mono}}>{tooltip.indexVal}</div>
                </div>
                <div style={{fontSize:14,fontWeight:800,fontFamily:T.mono,color:tooltip.pos?T.green:T.red}}>{tooltip.indexChg}</div>
              </div>
              <div style={{padding:"5px 12px 8px"}}>
                <div style={{fontSize:7.5,color:"#1e3a52",fontFamily:T.mono,letterSpacing:"0.06em",marginBottom:4}}>ACTIVE SIGNALS</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                  {tooltip.signals?.map(s=>(
                    <span key={s} style={{fontSize:8.5,padding:"2px 6px",borderRadius:2,background:"#0e2034",color:"#6a92a8",fontFamily:T.mono}}>{s}</span>
                  ))}
                </div>
              </div>
            </>)}
          </div>
        );
      })()}
    </div>
  );
}


export default memo(WorldMap);
