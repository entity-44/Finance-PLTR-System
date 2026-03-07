import { useState, useEffect, useRef } from "react";
// Leaflet loaded dynamically at runtime

const T = {
  bg:"#000000", surface:"#0a0a0a", panel:"#111111", panelHover:"#161616",
  border:"#222222", borderHi:"#333333",
  white:"#ffffff", grey100:"#f0f0f0", grey200:"#cccccc",
  grey400:"#888888", grey600:"#444444", grey700:"#333333", grey800:"#1a1a1a",
  green:"#22c55e", greenDim:"#16a34a", red:"#ef4444", redDim:"#dc2626",
  amber:"#f59e0b", blue:"#3b82f6",
  mono:"'JetBrains Mono','Fira Code',monospace",
  sans:"'DM Sans','Helvetica Neue',sans-serif",
};

// Deterministic sparkline data
function makeSparkData(seed, positive, n=28) {
  let s = seed;
  const rng = () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };
  const pts=[]; let v=50;
  for(let i=0;i<n;i++){
    const drift = positive ? 0.5 : -0.5;
    v = Math.max(6, Math.min(94, v + drift + (rng()-0.5)*10));
    pts.push(v);
  }
  return pts;
}

function Sparkline({ seed=42, positive=true, width=80, height=32, showArea=true }) {
  const pts = makeSparkData(seed, positive);
  const min=Math.min(...pts), max=Math.max(...pts), range=max-min||1;
  const sx = i => (i/(pts.length-1))*width;
  const sy = v => height-3-((v-min)/range)*(height-6);
  // Smooth cubic bezier
  const linePath = pts.map((v,i)=>{
    if(i===0) return `M${sx(i).toFixed(1)},${sy(v).toFixed(1)}`;
    const x0=sx(i-1),y0=sy(pts[i-1]),x1=sx(i),y1=sy(v);
    const cpx=(x0+x1)/2;
    return `C${cpx.toFixed(1)},${y0.toFixed(1)} ${cpx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }).join(" ");
  const areaPath = linePath+` L${width},${height} L0,${height} Z`;
  const color = positive ? T.green : T.red;
  const gid = `sp${seed}${positive?1:0}`;
  return (
    <svg width={width} height={height} style={{display:"block",flexShrink:0,overflow:"visible"}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {showArea && <path d={areaPath} fill={`url(#${gid})`}/>}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={sx(pts.length-1).toFixed(1)} cy={sy(pts[pts.length-1]).toFixed(1)} r="2.5" fill={color}
        style={{filter:`drop-shadow(0 0 3px ${color})`}}/>
    </svg>
  );
}

function MiniSpark({seed,positive,width=56,height=24}) {
  return <Sparkline seed={seed} positive={positive} width={width} height={height} showArea={false}/>;
}

function LiveDot({color=T.green,size=6}) {
  return (
    <span style={{position:"relative",display:"inline-flex",width:size,height:size,flexShrink:0}}>
      <span style={{position:"absolute",inset:0,borderRadius:"50%",background:color,animation:"livePulse 2s ease-out infinite",opacity:0.4}}/>
      <span style={{position:"absolute",inset:1,borderRadius:"50%",background:color}}/>
    </span>
  );
}

function Badge({label,color=T.grey400}) {
  return (
    <span style={{
      fontSize:9,fontWeight:700,letterSpacing:"0.08em",fontFamily:T.mono,
      whiteSpace:"nowrap",padding:"2px 6px",borderRadius:2,
      background:`${color}18`,color,border:`1px solid ${color}30`
    }}>{label}</span>
  );
}

function SevBadge({sev}) {
  const m={high:[T.red,"HIGH"],medium:[T.amber,"MED"],low:[T.grey400,"LOW"]};
  const [c,l]=m[sev]||m.low;
  return <Badge label={l} color={c}/>;
}

function Panel({title,sub,right,children,style={}}) {
  return (
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:6,
      overflow:"hidden",display:"flex",flexDirection:"column",...style}}>
      <div style={{display:"flex",alignItems:"center",gap:7,padding:"9px 14px",
        borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
        <LiveDot size={5} color={T.grey600}/>
        <span style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:T.grey200,
          fontFamily:T.mono,textTransform:"uppercase"}}>{title}</span>
        {sub && <span style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>{sub}</span>}
        {right && <span style={{marginLeft:"auto"}}>{right}</span>}
      </div>
      <div style={{flex:1,overflowY:"auto"}}>{children}</div>
    </div>
  );
}

function Row({children,hover=true}) {
  const [h,setH]=useState(false);
  return (
    <div onMouseEnter={()=>hover&&setH(true)} onMouseLeave={()=>hover&&setH(false)}
      style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",
        borderBottom:`1px solid ${T.border}`,background:h?T.panelHover:"transparent",
        transition:"background 0.1s",cursor:hover?"pointer":"default"}}>
      {children}
    </div>
  );
}

// ── COUNTRY FINANCIAL DATA ───────────────────────────────────────────────────
const COUNTRY_DATA = {
  "United States":    {code:"US",gdp:"$27.4T",gdpGrowth:"+2.5%",inflation:"3.4%",rate:"5.25%",currency:"USD",index:"S&P 500",indexVal:"5,842",indexChg:"+0.82%",debt:"122%",rating:"AA+",pos:true,signals:["Fed Hold","Strong Jobs","AI Boom"],risk:22},
  "China":            {code:"CN",gdp:"$17.7T",gdpGrowth:"+4.6%",inflation:"0.1%",rate:"3.45%",currency:"CNY",index:"CSI 300",indexVal:"3,421",indexChg:"-0.92%",debt:"83%",rating:"A+",pos:false,signals:["Deflation Risk","Property Crisis","PBOC Easing"],risk:58},
  "Germany":          {code:"DE",gdp:"$4.5T",gdpGrowth:"-0.2%",inflation:"2.5%",rate:"4.50%",currency:"EUR",index:"DAX",indexVal:"18,903",indexChg:"+0.55%",debt:"66%",rating:"AAA",pos:true,signals:["Recession Risk","Energy Shock","Auto Slowdown"],risk:35},
  "Japan":            {code:"JP",gdp:"$4.2T",gdpGrowth:"+0.4%",inflation:"2.8%",rate:"0.10%",currency:"JPY",index:"Nikkei",indexVal:"38,201",indexChg:"-0.41%",debt:"261%",rating:"A",pos:false,signals:["BOJ Pivot","Weak Yen","Aging Pop"],risk:42},
  "United Kingdom":   {code:"GB",gdp:"$3.1T",gdpGrowth:"+0.1%",inflation:"3.4%",rate:"5.25%",currency:"GBP",index:"FTSE 100",indexVal:"8,421",indexChg:"+0.21%",debt:"101%",rating:"AA",pos:true,signals:["Sticky Inflation","BoE Hold","Housing Stress"],risk:38},
  "France":           {code:"FR",gdp:"$3.0T",gdpGrowth:"+0.7%",inflation:"2.3%",rate:"4.50%",currency:"EUR",index:"CAC 40",indexVal:"8,052",indexChg:"+0.44%",debt:"111%",rating:"AA",pos:true,signals:["Fiscal Deficit","Olympic Boost","ECB Pivot"],risk:41},
  "India":            {code:"IN",gdp:"$3.7T",gdpGrowth:"+6.8%",inflation:"5.1%",rate:"6.50%",currency:"INR",index:"SENSEX",indexVal:"73,104",indexChg:"+0.67%",debt:"84%",rating:"BBB-",pos:true,signals:["EM Outperformer","FDI Surge","Digital Growth"],risk:28},
  "Canada":           {code:"CA",gdp:"$2.1T",gdpGrowth:"+1.1%",inflation:"2.9%",rate:"5.00%",currency:"CAD",index:"TSX",indexVal:"21,834",indexChg:"+0.61%",debt:"107%",rating:"AAA",pos:true,signals:["Housing Bubble","Oil Tailwind","BoC Cut Path"],risk:30},
  "Brazil":           {code:"BR",gdp:"$2.1T",gdpGrowth:"+2.9%",inflation:"4.5%",rate:"10.75%",currency:"BRL",index:"IBOVESPA",indexVal:"128,422",indexChg:"-0.33%",debt:"89%",rating:"BB",pos:false,signals:["Fiscal Risk","Commodity Play","EM Volatility"],risk:62},
  "Australia":        {code:"AU",gdp:"$1.7T",gdpGrowth:"+1.5%",inflation:"3.4%",rate:"4.35%",currency:"AUD",index:"ASX 200",indexVal:"7,812",indexChg:"+0.44%",debt:"48%",rating:"AAA",pos:true,signals:["China Exposure","Rate Peak","Resource Boom"],risk:24},
  "South Korea":      {code:"KR",gdp:"$1.7T",gdpGrowth:"+2.3%",inflation:"2.6%",rate:"3.50%",currency:"KRW",index:"KOSPI",indexVal:"2,641",indexChg:"+0.82%",debt:"53%",rating:"AA",pos:true,signals:["Semi Cycle","K-Export","BOK Hold"],risk:27},
  "Russia":           {code:"RU",gdp:"$1.9T",gdpGrowth:"+3.2%",inflation:"7.4%",rate:"16.0%",currency:"RUB",index:"MOEX",indexVal:"3,312",indexChg:"+1.24%",debt:"21%",rating:"NR",pos:false,signals:["Sanctions","War Economy","Energy Revenue"],risk:88},
  "Saudi Arabia":     {code:"SA",gdp:"$1.1T",gdpGrowth:"+1.7%",inflation:"1.6%",rate:"6.00%",currency:"SAR",index:"TADAWUL",indexVal:"12,041",indexChg:"+1.12%",debt:"24%",rating:"A",pos:true,signals:["Oil Policy","Vision 2030","OPEC+ Control"],risk:31},
  "South Africa":     {code:"ZA",gdp:"$0.4T",gdpGrowth:"+0.6%",inflation:"5.3%",rate:"8.25%",currency:"ZAR",index:"JSE",indexVal:"73,241",indexChg:"+0.15%",debt:"74%",rating:"BB-",pos:false,signals:["Load Shedding","Political Risk","Mining Output"],risk:71},
  "Singapore":        {code:"SG",gdp:"$0.5T",gdpGrowth:"+2.2%",inflation:"2.9%",rate:"N/A",currency:"SGD",index:"STI",indexVal:"3,204",indexChg:"+0.08%",debt:"160%",rating:"AAA",pos:true,signals:["Trade Hub","Wealth Mgmt","MAS Steady"],risk:14},
  "Switzerland":      {code:"CH",gdp:"$0.9T",gdpGrowth:"+1.2%",inflation:"1.3%",rate:"1.50%",currency:"CHF",index:"SMI",indexVal:"11,521",indexChg:"+0.22%",debt:"42%",rating:"AAA",pos:true,signals:["CHF Safe Haven","SNB Cut","Banking Hub"],risk:11},
  "United Arab Emirates":{code:"AE",gdp:"$0.5T",gdpGrowth:"+4.0%",inflation:"2.3%",rate:"5.40%",currency:"AED",index:"DFM",indexVal:"4,121",indexChg:"+1.12%",debt:"27%",rating:"AA",pos:true,signals:["Oil Wealth","FinHub Growth","Tourism Boom"],risk:19},
  "Mexico":           {code:"MX",gdp:"$1.3T",gdpGrowth:"+2.5%",inflation:"4.4%",rate:"11.00%",currency:"MXN",index:"IPC",indexVal:"55,242",indexChg:"+0.38%",debt:"49%",rating:"BBB",pos:true,signals:["Nearshoring Boom","Banxico Cuts","US Trade Link"],risk:36},
  "Argentina":        {code:"AR",gdp:"$0.6T",gdpGrowth:"-2.5%",inflation:"276%",rate:"100%",currency:"ARS",index:"MERVAL",indexVal:"1,124,221",indexChg:"-1.80%",debt:"144%",rating:"CC",pos:false,signals:["Hyperinflation","IMF Program","Dollarization Push"],risk:97},
  "Turkey":           {code:"TR",gdp:"$1.1T",gdpGrowth:"+4.5%",inflation:"68%",rate:"50.0%",currency:"TRY",index:"BIST 100",indexVal:"9,841",indexChg:"-0.72%",debt:"33%",rating:"B",pos:false,signals:["Currency Crisis","Erdogan Policy","Inflation Shock"],risk:79},
  "Iran":             {code:"IR",gdp:"$0.4T",gdpGrowth:"+4.7%",inflation:"42%",rate:"23.0%",currency:"IRR",index:"TSE",indexVal:"2,041,222",indexChg:"-1.20%",debt:"38%",rating:"NR",pos:false,signals:["Sanctions","Oil Evasion","Geopolitical Risk"],risk:91},
  "Nigeria":          {code:"NG",gdp:"$0.4T",gdpGrowth:"+3.2%",inflation:"31%",rate:"24.75%",currency:"NGN",index:"NGX",indexVal:"97,241",indexChg:"-2.10%",debt:"39%",rating:"B-",pos:false,signals:["FX Crisis","Oil Dependent","Debt Restructure"],risk:82},
  "Indonesia":        {code:"ID",gdp:"$1.4T",gdpGrowth:"+5.1%",inflation:"2.8%",rate:"6.25%",currency:"IDR",index:"IDX",indexVal:"7,284",indexChg:"+0.52%",debt:"39%",rating:"BBB",pos:true,signals:["Resource Rich","EM Growth","BI Steady"],risk:32},
  "Netherlands":      {code:"NL",gdp:"$1.0T",gdpGrowth:"+0.5%",inflation:"2.9%",rate:"4.50%",currency:"EUR",index:"AEX",indexVal:"881",indexChg:"+0.38%",debt:"50%",rating:"AAA",pos:true,signals:["Trade Hub","Shell HQ","ECB Linked"],risk:18},
  "Spain":            {code:"ES",gdp:"$1.6T",gdpGrowth:"+2.1%",inflation:"2.8%",rate:"4.50%",currency:"EUR",index:"IBEX 35",indexVal:"10,841",indexChg:"+0.62%",debt:"109%",rating:"A",pos:true,signals:["Tourism Recovery","ECB Pivot","Debt Watch"],risk:33},
  "Italy":            {code:"IT",gdp:"$2.2T",gdpGrowth:"+0.9%",inflation:"1.2%",rate:"4.50%",currency:"EUR",index:"FTSE MIB",indexVal:"33,241",indexChg:"+0.41%",debt:"143%",rating:"BBB",pos:true,signals:["Debt Burden","ECB Backstop","PNRR Funds"],risk:44},
  "Norway":           {code:"NO",gdp:"$0.5T",gdpGrowth:"+2.0%",inflation:"3.9%",rate:"4.50%",currency:"NOK",index:"OBX",indexVal:"1,241",indexChg:"+0.55%",debt:"40%",rating:"AAA",pos:true,signals:["Oil Fund","Sovereign Wealth","Energy Export"],risk:9},
};

// ── Financial hub markers
const FIN_HUBS=[
  {id:"nyc",name:"NYSE / NASDAQ",    lat:40.7, lon:-74.0,  type:"exchange"},
  {id:"lon",name:"London Stock Exch",lat:51.5, lon:-0.1,   type:"exchange"},
  {id:"tok",name:"Tokyo Stock Exch", lat:35.7, lon:139.7,  type:"exchange"},
  {id:"sha",name:"Shanghai Stock Exch",lat:31.2,lon:121.5, type:"exchange"},
  {id:"hkg",name:"HKEX",            lat:22.3, lon:114.2,  type:"exchange"},
  {id:"sgp",name:"SGX Singapore",   lat:1.3,  lon:103.8,  type:"exchange"},
  {id:"fra",name:"ECB Frankfurt",   lat:50.1, lon:8.7,    type:"central"},
  {id:"zur",name:"BIS / SNB Zurich",lat:47.4, lon:8.5,    type:"central"},
  {id:"dxb",name:"DIFC Dubai",      lat:25.2, lon:55.3,   type:"commodity"},
  {id:"syd",name:"ASX Sydney",      lat:-33.9,lon:151.2,  type:"exchange"},
];

// ── Leaflet-based interactive world map
function WorldMap(){
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({x:0,y:0});
  const [layers, setLayers] = useState({cables:true,routes:true,pipelines:true,flows:true,hubs:true,night:true});
  const [now, setNow] = useState(new Date());
  const overlayRefs = useRef({});
  const containerRef = useRef(null);

  useEffect(()=>{
    const t = setInterval(()=>setNow(new Date()), 60000);
    return ()=>clearInterval(t);
  },[]);

  useEffect(()=>{
    if(leafletMap.current || !mapRef.current) return;

    // Load Leaflet CSS
    if(!document.getElementById("leaflet-css")){
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      if(typeof window.L === "undefined") { setTimeout(initMap, 100); return; }
      const L = window.L;

      const map = L.map(mapRef.current, {
        center: [20, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 6,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: false,
      });

      // Dark CartoDB tiles — matches our aesthetic perfectly
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        opacity: 1,
      }).addTo(map);

      // Country GeoJSON with hover interaction
      fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
        .then(r=>r.json())
        .then(geo=>{
          const geoLayer = L.geoJSON(geo, {
            style: feat => {
              const name = feat.properties.ADMIN;
              const d = COUNTRY_DATA[name];
              if(!d) return { fillColor:"#1a2433", fillOpacity:0.5, color:"#1e3048", weight:0.5 };
              const risk = d.risk;
              let fill = "#1a2d1a"; // default greenish for low risk
              if(risk >= 80) fill = "#3d0f0f";
              else if(risk >= 60) fill = "#3d2a0a";
              else if(risk >= 40) fill = "#1f2d0f";
              else if(risk >= 20) fill = "#0f2d1a";
              else fill = "#0a1e2d";
              return { fillColor:fill, fillOpacity:0.7, color:"#1e3a52", weight:0.7, dashArray:null };
            },
            onEachFeature: (feat, layer) => {
              layer.on({
                mousemove: e => {
                  const name = feat.properties.ADMIN;
                  const d = COUNTRY_DATA[name];
                  const rect = containerRef.current?.getBoundingClientRect();
                  if(rect){
                    setTooltipPos({ x: e.originalEvent.clientX - rect.left, y: e.originalEvent.clientY - rect.top });
                  }
                  setTooltip(d ? {...d, name} : { name, noData: true });
                  layer.setStyle({ fillOpacity: 0.92, color:"#00c8f0", weight:1.2 });
                },
                mouseout: () => {
                  setTooltip(null);
                  geoLayer.resetStyle(layer);
                },
              });
            }
          }).addTo(map);
        }).catch(()=>{});

      // Trade routes as polylines
      const tradeRoutes = [
        {pts:[[-74,41],[-40,35],[-10,36],[0,51]], color:"#0ea5e9", name:"Trans-Atlantic"},
        {pts:[[0,51],[10,37],[32,30],[43,13],[55,25],[72,19],[80,13],[104,1],[122,31],[140,36]], color:"#0ea5e9", name:"Europe-Asia Suez"},
        {pts:[[-74,41],[-100,25],[-130,38],[-150,50],[140,36]], color:"#0ea5e9", name:"Trans-Pacific"},
        {pts:[[104,1],[115,5],[130,-15],[151,-34]], color:"#0ea5e9", name:"Asia-Australia"},
        {pts:[[10,37],[18,-34],[28,-26],[55,25]], color:"#0ea5e9", name:"Cape of Good Hope"},
      ];
      overlayRefs.current.routes = tradeRoutes.map(r =>
        L.polyline(r.pts.map(([lon,lat])=>[lat,lon]),{
          color: r.color, weight:1.5, opacity:0.5, dashArray:"8,18"
        }).addTo(map)
      );

      // Undersea cables
      const cables = [
        {pts:[[-74,41],[-52,48],[-15,52],[0,51]], color:"#8b5cf6"},
        {pts:[[0,51],[10,37],[32,30],[55,25],[72,19],[80,8],[104,1],[114,22],[122,31],[140,36]], color:"#7c3aed"},
        {pts:[[-74,40],[-130,40],[-140,42],[140,36]], color:"#6366f1"},
        {pts:[[151,-34],[179,-37],[-161,34],[-74,40]], color:"#4f46e5"},
      ];
      overlayRefs.current.cables = cables.map(c =>
        L.polyline(c.pts.map(([lon,lat])=>[lat,lon]),{
          color: c.color, weight:1.2, opacity:0.55, dashArray:"3,14"
        }).addTo(map)
      );

      // Pipelines
      const pipes = [
        {pts:[[37,56],[60,57],[80,60],[104,52],[122,50],[130,48]], color:"#f97316"},
        {pts:[[28,60],[18,56],[10,57],[8,54]], color:"#ea580c"},
        {pts:[[-111,50],[-97,46],[-96,36],[-95,30]], color:"#f97316"},
        {pts:[[50,26],[45,24],[37,14],[43,13]], color:"#d97706"},
        {pts:[[37,52],[28,52],[20,51],[14,52],[10,51],[8,50]], color:"#ea580c"},
      ];
      overlayRefs.current.pipelines = pipes.map(p =>
        L.polyline(p.pts.map(([lon,lat])=>[lat,lon]),{
          color: p.color, weight:2, opacity:0.5, dashArray:"4,8"
        }).addTo(map)
      );

      // Capital flow arcs — use curved decorators via simple polylines
      const flows = [
        [[-74,40],[0,51]],[[0,51],[139,35]],[[-74,40],[139,35]],
        [[0,51],[55,25]],[[55,25],[72,19]],[[72,19],[103,1]],
        [[103,1],[151,-34]],[[114,22],[121,31]],[[0,51],[8,50]],
      ];
      overlayRefs.current.flows = flows.map(([a,b]) =>
        L.polyline([[a[1],a[0]],[b[1],b[0]]],{
          color:"#22c55e", weight:1, opacity:0.35, dashArray:"2,16"
        }).addTo(map)
      );

      // Hub markers as custom icons
      const hubIcon = (type) => L.divIcon({
        className:"",
        html:`<div style="
          width:10px;height:10px;border-radius:50%;
          background:${type==="central"?"#f97316":type==="commodity"?"#fbbf24":"#00c8f0"};
          border:2px solid rgba(255,255,255,0.4);
          box-shadow:0 0 10px ${type==="central"?"#f97316":type==="commodity"?"#fbbf24":"#00c8f0"}90;
          position:relative;
        ">
          <div style="
            position:absolute;top:-2px;left:-2px;right:-2px;bottom:-2px;
            border-radius:50%;border:1px solid ${type==="central"?"#f97316":"#00c8f0"}60;
            animation:hubPulse 2s ease-out infinite;
          "></div>
        </div>`,
        iconSize:[10,10],
        iconAnchor:[5,5],
      });
      overlayRefs.current.hubs = FIN_HUBS.map(h =>
        L.marker([h.lat,h.lon],{icon:hubIcon(h.type)})
          .bindTooltip(`<span style="font-family:monospace;font-size:11px;color:#00c8f0;background:#050d18;border:1px solid #163350;padding:4px 8px;border-radius:3px">${h.name}</span>`,
            {className:"", permanent:false, direction:"top", offset:[0,-8]})
          .addTo(map)
      );

      L.control.zoom({position:"bottomright"}).addTo(map);

      leafletMap.current = map;
    };

    if(!document.getElementById("leaflet-js")){
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, []);

  // Toggle overlay visibility
  useEffect(()=>{
    if(!leafletMap.current || typeof window.L === "undefined") return;
    const map = leafletMap.current;
    const toggleGroup = (key, show) => {
      const group = overlayRefs.current[key];
      if(!group) return;
      const arr = Array.isArray(group) ? group : [group];
      arr.forEach(l => show ? l.addTo(map) : l.remove());
    };
    toggleGroup("routes", layers.routes);
    toggleGroup("cables", layers.cables);
    toggleGroup("pipelines", layers.pipelines);
    toggleGroup("flows", layers.flows);
    toggleGroup("hubs", layers.hubs);
  }, [layers]);

  const LAYER_BTNS = [
    {k:"routes",   label:"TRADE",   color:"#0ea5e9"},
    {k:"cables",   label:"CABLES",  color:"#8b5cf6"},
    {k:"pipelines",label:"PIPES",   color:"#f97316"},
    {k:"flows",    label:"FLOWS",   color:"#22c55e"},
    {k:"hubs",     label:"HUBS",    color:"#00c8f0"},
  ];

  const getRiskColor = r => r>=80?"#ef4444":r>=60?"#f97316":r>=40?"#fbbf24":r>=20?"#86efac":"#22c55e";
  const getRiskLabel = r => r>=80?"CRITICAL":r>=60?"HIGH":r>=40?"ELEVATED":r>=20?"WATCH":"STABLE";

  return (
    <div ref={containerRef} style={{position:"relative",width:"100%",height:"100%",background:"#02060e",overflow:"hidden"}}>
      <style>{`
        .leaflet-container{background:#02060e!important}
        .leaflet-control-zoom{border:1px solid #1e3048!important;border-radius:3px!important;overflow:hidden}
        .leaflet-control-zoom a{background:#060d16!important;color:#6a92a8!important;border-bottom:1px solid #1e3048!important;font-size:16px!important;line-height:26px!important;width:26px!important;height:26px!important}
        .leaflet-control-zoom a:hover{background:#0e1e2d!important;color:#00c8f0!important}
        .leaflet-tooltip{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important}
        @keyframes hubPulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(2.2);opacity:0}}
      `}</style>

      {/* Leaflet map container */}
      <div ref={mapRef} style={{position:"absolute",inset:0,zIndex:1}}/>

      {/* Layer controls */}
      <div style={{position:"absolute",top:10,right:10,zIndex:500,display:"flex",gap:3,flexWrap:"wrap",justifyContent:"flex-end"}}>
        {LAYER_BTNS.map(l=>(
          <button key={l.k} onClick={()=>setLayers(p=>({...p,[l.k]:!p[l.k]}))} style={{
            background:layers[l.k]?`${l.color}20`:"#06101880",
            border:`1px solid ${layers[l.k]?l.color+"55":"#1e3048"}`,
            color:layers[l.k]?l.color:"#3a5a72",padding:"3px 8px",borderRadius:3,
            cursor:"pointer",fontSize:9,fontWeight:700,fontFamily:T.mono,
            letterSpacing:"0.06em",transition:"all 0.15s",backdropFilter:"blur(4px)"
          }}>{l.label}</button>
        ))}
      </div>

      {/* UTC clock */}
      <div style={{
        position:"absolute",top:10,left:10,zIndex:500,
        background:"#06101890",border:"1px solid #1e3048",
        borderRadius:3,padding:"4px 9px",backdropFilter:"blur(4px)"
      }}>
        <span style={{fontSize:9,color:"#3a5a72",fontFamily:T.mono,letterSpacing:"0.1em"}}>
          {now.toUTCString().slice(0,25)} UTC
        </span>
      </div>

      {/* Legend */}
      <div style={{
        position:"absolute",bottom:10,left:10,zIndex:500,
        display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",
        background:"#06101880",border:"1px solid #1e3048",
        borderRadius:3,padding:"5px 10px",backdropFilter:"blur(4px)"
      }}>
        {[
          ["#22c55e","LOW RISK"],["#86efac","WATCH"],
          ["#fbbf24","ELEVATED"],["#f97316","HIGH"],["#ef4444","CRITICAL"]
        ].map(([c,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:8,height:8,borderRadius:2,background:c,opacity:0.9}}/>
            <span style={{fontSize:8,color:"#3a5a72",fontFamily:T.mono}}>{l}</span>
          </div>
        ))}
      </div>

      {/* Country hover tooltip */}
      {tooltip && (
        <div style={{
          position:"absolute",
          left: tooltipPos.x + 16,
          top: tooltipPos.y - 10,
          zIndex:600,
          pointerEvents:"none",
          width:260,
          background:"#04090f",
          border:"1px solid #163350",
          borderRadius:4,
          overflow:"hidden",
          boxShadow:"0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px #00c8f010",
        }}>
          {/* Header */}
          <div style={{
            background:"#060e1a",borderBottom:"1px solid #0e2034",
            padding:"8px 12px",display:"flex",alignItems:"center",gap:8
          }}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"#e2f2fc",letterSpacing:"0.03em"}}>{tooltip.name}</div>
              {tooltip.code && <div style={{fontSize:9,color:"#3a5a72",fontFamily:T.mono,letterSpacing:"0.1em"}}>{tooltip.code} · COUNTRY INTELLIGENCE</div>}
            </div>
            {tooltip.risk!=null && (
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:18,fontWeight:800,color:getRiskColor(tooltip.risk),fontFamily:T.mono,lineHeight:1}}>{tooltip.risk}</div>
                <div style={{fontSize:8,color:getRiskColor(tooltip.risk),fontFamily:T.mono,letterSpacing:"0.08em"}}>{getRiskLabel(tooltip.risk)}</div>
              </div>
            )}
          </div>

          {tooltip.noData ? (
            <div style={{padding:"12px",fontSize:10,color:"#3a5a72",fontFamily:T.mono}}>No financial data available</div>
          ) : (
            <>
              {/* Risk bar */}
              <div style={{padding:"6px 12px 4px",borderBottom:"1px solid #0e2034"}}>
                <div style={{fontSize:8,color:"#3a5a72",fontFamily:T.mono,marginBottom:4,letterSpacing:"0.08em"}}>FINANCIAL RISK INDEX</div>
                <div style={{height:4,background:"#0e2034",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${tooltip.risk}%`,background:`linear-gradient(90deg,#22c55e,${getRiskColor(tooltip.risk)})`,borderRadius:2,transition:"width 0.3s"}}/>
                </div>
              </div>

              {/* Key metrics grid */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,borderBottom:"1px solid #0e2034"}}>
                {[
                  ["GDP",tooltip.gdp],["GROWTH",tooltip.gdpGrowth],
                  ["INFLATION",tooltip.inflation],["RATE",tooltip.rate],
                  ["DEBT/GDP",tooltip.debt],["RATING",tooltip.rating],
                ].map(([k,v],i)=>(
                  <div key={k} style={{
                    padding:"5px 12px",
                    borderBottom:i<4?"1px solid #0e2034":"none",
                    borderRight:i%2===0?"1px solid #0e2034":"none"
                  }}>
                    <div style={{fontSize:8,color:"#3a5a72",fontFamily:T.mono,letterSpacing:"0.08em",marginBottom:1}}>{k}</div>
                    <div style={{
                      fontSize:11,fontWeight:700,fontFamily:T.mono,
                      color: k==="GROWTH" ? (v.startsWith("+")?"#22c55e":"#ef4444")
                           : k==="RATING" ? (["AAA","AA+","AA","AA-","A+","A"].includes(v)?"#22c55e":v.startsWith("B")?"#fbbf24":"#ef4444")
                           : "#e2f2fc"
                    }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Market index */}
              <div style={{padding:"5px 12px",borderBottom:"1px solid #0e2034",display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:8,color:"#3a5a72",fontFamily:T.mono,letterSpacing:"0.08em"}}>{tooltip.index}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#e2f2fc",fontFamily:T.mono}}>{tooltip.indexVal}</div>
                </div>
                <div style={{
                  fontSize:12,fontWeight:800,fontFamily:T.mono,
                  color:tooltip.pos?"#22c55e":"#ef4444"
                }}>{tooltip.indexChg}</div>
              </div>

              {/* Signals */}
              <div style={{padding:"6px 12px 8px"}}>
                <div style={{fontSize:8,color:"#3a5a72",fontFamily:T.mono,letterSpacing:"0.08em",marginBottom:4}}>ACTIVE SIGNALS</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                  {tooltip.signals.map(s=>(
                    <span key={s} style={{
                      fontSize:9,padding:"2px 6px",borderRadius:2,
                      background:"#0e2034",color:"#6a92a8",fontFamily:T.mono
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── DATA ─────────────────────────────────────────────────────────────────────
const MARKETS=[
  {name:"S&P 500",  val:"5,842.3", chg:"+0.82%",pos:true, seed:11},
  {name:"NASDAQ",   val:"18,421.7",chg:"+1.14%",pos:true, seed:22},
  {name:"DOW",      val:"43,120.5",chg:"+0.43%",pos:true, seed:33},
  {name:"VIX",      val:"18.42",   chg:"−2.31%",pos:false,seed:44},
  {name:"Russell 2K",val:"2,234.1",chg:"+0.67%",pos:true, seed:55},
  {name:"DAX",      val:"18,903.4",chg:"+0.55%",pos:true, seed:66},
  {name:"FTSE 100", val:"8,421.2", chg:"+0.21%",pos:true, seed:77},
  {name:"Nikkei",   val:"38,201.4",chg:"−0.38%",pos:false,seed:88},
];
const COMMODITIES=[
  {name:"WTI Crude",val:"$71.24",chg:"+1.24%",pos:true, unit:"bbl",seed:101},
  {name:"Brent",    val:"$75.81",chg:"+1.18%",pos:true, unit:"bbl",seed:102},
  {name:"Gold",     val:"$2,312", chg:"+0.44%",pos:true, unit:"oz", seed:103},
  {name:"Silver",   val:"$27.84",chg:"+0.82%",pos:true, unit:"oz", seed:104},
  {name:"Copper",   val:"$4.21",  chg:"−0.56%",pos:false,unit:"lb", seed:105},
  {name:"Nat. Gas", val:"$2.84",  chg:"−1.23%",pos:false,unit:"mmBtu",seed:106},
];
const FOREX=[
  {pair:"EUR/USD",val:"1.0842",chg:"−0.12%",pos:false,seed:201},
  {pair:"USD/JPY",val:"149.82",chg:"+0.34%",pos:true, seed:202},
  {pair:"GBP/USD",val:"1.2634",chg:"+0.08%",pos:true, seed:203},
  {pair:"DXY",    val:"104.42",chg:"+0.18%",pos:true, seed:204},
  {pair:"AUD/USD",val:"0.6534",chg:"+0.22%",pos:true, seed:205},
  {pair:"USD/CHF",val:"0.8921",chg:"−0.05%",pos:false,seed:206},
];
const CRYPTO=[
  {sym:"BTC",name:"Bitcoin", val:"$67,234",chg:"+2.84%",pos:true, seed:301},
  {sym:"ETH",name:"Ethereum",val:"$3,421", chg:"+3.12%",pos:true, seed:302},
  {sym:"SOL",name:"Solana",  val:"$182.40",chg:"+4.21%",pos:true, seed:303},
  {sym:"XRP",name:"XRP",     val:"$0.584", chg:"−0.82%",pos:false,seed:304},
];
const YIELDS_DATA=[
  {t:"1M",v:5.28},{t:"3M",v:5.31},{t:"6M",v:5.18},
  {t:"1Y",v:5.02},{t:"2Y",v:4.82},{t:"5Y",v:4.62},
  {t:"10Y",v:4.42},{t:"30Y",v:4.61},
];
const NEWS=[
  {time:"09:42",sev:"high",  title:"Fed officials signal rate hold through Q2 amid persistent inflation",src:"Reuters"},
  {time:"09:31",sev:"medium",title:"JPMorgan Q1 earnings beat estimates; IB revenue surges 21%",src:"Bloomberg"},
  {time:"09:18",sev:"low",   title:"Oil rises on Middle East supply concerns and stronger IEA demand outlook",src:"WSJ"},
  {time:"08:55",sev:"medium",title:"China PMI contracts second consecutive month, raising growth concerns",src:"FT"},
  {time:"08:44",sev:"high",  title:"Regional bank index falls 2.3% premarket on CRE exposure fears",src:"CNBC"},
  {time:"08:22",sev:"low",   title:"ECB holds rates, signals summer cut still on table pending data",src:"Reuters"},
];
const FILINGS=[
  {ticker:"AAPL",co:"Apple Inc",        type:"10-Q",  time:"09:15",ai:"Revenue +8% YoY. Services slowing. China −4%."},
  {ticker:"JPM", co:"JPMorgan Chase",   type:"8-K",   time:"08:45",ai:"Q1 beat. NII guidance raised. Credit stable."},
  {ticker:"XOM", co:"ExxonMobil",       type:"Form 4",time:"08:20",ai:"CEO purchased 50,000 shares at $112.40."},
  {ticker:"NVDA",co:"Nvidia Corp",      type:"S-1 A", time:"07:55",ai:"Updated offering. Data center demand strong."},
  {ticker:"TSLA",co:"Tesla Inc",        type:"10-Q",  time:"07:30",ai:"Margins compressed. Delivery miss. Cuts ongoing."},
];
const ALERTS_DATA=[
  {id:1,time:"09:44",type:"MARKET",sev:"high",  msg:"VIX spike detected: +12% in 15 minutes"},
  {id:2,time:"09:38",type:"FILING",sev:"medium",msg:"New 8-K filed: Bank of America — material event"},
  {id:3,time:"09:21",type:"MACRO", sev:"high",  msg:"CPI print: 3.4% vs 3.1% expected — ABOVE FORECAST"},
  {id:4,time:"09:05",type:"MARKET",sev:"medium",msg:"Treasury 10Y yield crossed 4.5% threshold"},
  {id:5,time:"08:52",type:"NEWS",  sev:"low",   msg:"3 articles clustering: regional bank stress signals"},
];
const SECTORS=[
  {name:"Technology",  p:+2.14,w:28},{name:"Financials",  p:+0.88,w:14},
  {name:"Healthcare",  p:-0.42,w:13},{name:"Cons. Disc.", p:+1.21,w:11},
  {name:"Industrials", p:+0.65,w:9}, {name:"Energy",      p:+1.84,w:8},
  {name:"Comm. Svcs",  p:+1.43,w:8}, {name:"Materials",   p:-0.31,w:4},
  {name:"Utilities",   p:-0.88,w:3}, {name:"Real Estate", p:-1.24,w:3},
];
const BANKS=[
  {ticker:"JPM",name:"JPMorgan",       price:"$198.42",chg:"+1.24%",pos:true, cds:48},
  {ticker:"GS", name:"Goldman Sachs",  price:"$421.30",chg:"+0.84%",pos:true, cds:62},
  {ticker:"BAC",name:"Bank of America",price:"$38.21", chg:"+0.42%",pos:true, cds:71},
  {ticker:"MS", name:"Morgan Stanley", price:"$94.82", chg:"−0.21%",pos:false,cds:55},
  {ticker:"C",  name:"Citigroup",      price:"$62.44", chg:"−0.58%",pos:false,cds:84},
];
const FED_DATA=[
  {label:"Fed Funds Rate", val:"5.25–5.50%",status:"HOLD",  ok:true},
  {label:"Balance Sheet",  val:"$7.42T",    status:"QT",    ok:true},
  {label:"Next FOMC",      val:"May 1, 2025",status:"26D",  ok:true},
  {label:"PCE Inflation",  val:"2.8%",      status:"ABOVE", ok:false},
  {label:"Unemployment",   val:"3.9%",      status:"WATCH", ok:false},
];
const ECON=[
  {label:"CPI YoY",     val:"3.4%", prev:"3.1%", up:true},
  {label:"PCE YoY",     val:"2.8%", prev:"2.7%", up:true},
  {label:"GDP QoQ",     val:"1.6%", prev:"3.4%", up:false},
  {label:"Unemployment",val:"3.9%", prev:"3.7%", up:true},
  {label:"Retail Sales",val:"+0.4%",prev:"−0.8%",up:true},
  {label:"ISM Mfg PMI", val:"50.3", prev:"47.8", up:true},
];
const IPO_MA=[
  {type:"M&A", name:"Synopsys / ANSYS",      size:"$35.0B",sector:"Tech",   status:"PENDING",sc:T.amber},
  {type:"IPO", name:"Reddit Inc.",            size:"$6.4B", sector:"Social", status:"PRICED", sc:T.green},
  {type:"M&A", name:"Capital One / Discover", size:"$35.3B",sector:"Finance",status:"REVIEW", sc:"#f97316"},
  {type:"IPO", name:"Shein Group",            size:"$50B+", sector:"Retail", status:"FILED",  sc:T.blue},
  {type:"SPAC",name:"GreenTech Holdings",     size:"$800M", sector:"Energy", status:"ACTIVE", sc:T.grey400},
];

// ── PANELS ───────────────────────────────────────────────────────────────────

function MarketsPanel() {
  return (
    <Panel title="Global Markets" right={<Badge label="LIVE" color={T.green}/>}>
      {MARKETS.map(m=>(
        <Row key={m.name}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:600,color:T.white,fontFamily:T.mono}}>{m.name}</div>
            <div style={{fontSize:10,color:T.grey400,fontFamily:T.mono}}>{m.val}</div>
          </div>
          <MiniSpark seed={m.seed} positive={m.pos} width={62} height={28}/>
          <div style={{fontSize:11,fontWeight:700,minWidth:54,textAlign:"right",
            color:m.pos?T.green:T.red,fontFamily:T.mono}}>{m.chg}</div>
        </Row>
      ))}
    </Panel>
  );
}

function NewsPanel() {
  return (
    <Panel title="Market Intelligence" sub={`· ${NEWS.length} stories`}>
      {NEWS.map((n,i)=>(
        <Row key={i}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
              <span style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>{n.time}</span>
              <SevBadge sev={n.sev}/>
              <span style={{marginLeft:"auto",fontSize:9,color:T.grey600}}>{n.src}</span>
            </div>
            <div style={{fontSize:11,color:T.grey200,lineHeight:1.45}}>{n.title}</div>
          </div>
        </Row>
      ))}
    </Panel>
  );
}

function AlertsPanel() {
  const [dismissed,setDismissed]=useState(new Set());
  const visible=ALERTS_DATA.filter(a=>!dismissed.has(a.id));
  const tc={MARKET:T.blue,FILING:T.amber,MACRO:T.red,NEWS:T.grey400};
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
          <div key={a.id} style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`,
            background:a.sev==="high"?`${T.red}08`:"transparent"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
              {a.sev==="high"&&<LiveDot size={6} color={T.red}/>}
              <Badge label={a.type} color={tc[a.type]||T.grey400}/>
              <SevBadge sev={a.sev}/>
              <span style={{marginLeft:"auto",fontSize:9,color:T.grey600,fontFamily:T.mono}}>{a.time}</span>
              <button onClick={()=>setDismissed(p=>new Set([...p,a.id]))} style={{
                background:"none",border:"none",color:T.grey600,cursor:"pointer",
                fontSize:15,lineHeight:1,padding:"0 0 0 4px"}}>×</button>
            </div>
            <div style={{fontSize:10,color:T.grey200,lineHeight:1.45}}>{a.msg}</div>
          </div>
        ))
      }
    </Panel>
  );
}

function SECPanel() {
  return (
    <Panel title="SEC Filings" sub="· AI summaries">
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

function CommoditiesPanel() {
  return (
    <Panel title="Commodities" right={<Badge label="SPOT" color={T.grey400}/>}>
      {COMMODITIES.map(c=>(
        <Row key={c.name}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:T.white,fontWeight:600}}>{c.name}</div>
            <div style={{fontSize:9,color:T.grey600,fontFamily:T.mono}}>per {c.unit}</div>
          </div>
          <MiniSpark seed={c.seed} positive={c.pos} width={56} height={26}/>
          <div style={{textAlign:"right",minWidth:70}}>
            <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono}}>{c.val}</div>
            <div style={{fontSize:10,color:c.pos?T.green:T.red,fontWeight:600}}>{c.chg}</div>
          </div>
        </Row>
      ))}
    </Panel>
  );
}

function ForexPanel() {
  return (
    <Panel title="FX / Currencies" right={<Badge label="LIVE" color={T.green}/>}>
      {FOREX.map(f=>(
        <Row key={f.pair}>
          <div style={{flex:1,fontSize:12,fontWeight:700,color:T.white,fontFamily:T.mono}}>{f.pair}</div>
          <MiniSpark seed={f.seed} positive={f.pos} width={56} height={26}/>
          <div style={{textAlign:"right",minWidth:80}}>
            <div style={{fontSize:11,color:T.white,fontFamily:T.mono}}>{f.val}</div>
            <div style={{fontSize:10,color:f.pos?T.green:T.red,fontWeight:600}}>{f.chg}</div>
          </div>
        </Row>
      ))}
    </Panel>
  );
}

function CryptoPanel() {
  return (
    <Panel title="Digital Assets" right={<Badge label="CRYPTO" color={T.grey400}/>}>
      {CRYPTO.map(c=>(
        <Row key={c.sym}>
          <div style={{width:30,height:30,borderRadius:5,flexShrink:0,
            background:T.grey800,border:`1px solid ${T.grey700}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:8,fontWeight:800,color:T.white,fontFamily:T.mono}}>{c.sym}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:600,color:T.white}}>{c.name}</div>
          </div>
          <MiniSpark seed={c.seed} positive={c.pos} width={56} height={26}/>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono}}>{c.val}</div>
            <div style={{fontSize:10,color:c.pos?T.green:T.red,fontWeight:600}}>{c.chg}</div>
          </div>
        </Row>
      ))}
    </Panel>
  );
}

function FixedIncomePanel() {
  const min=Math.min(...YIELDS_DATA.map(d=>d.v));
  const max=Math.max(...YIELDS_DATA.map(d=>d.v));
  const W=220,H=58;
  const sx=i=>(i/(YIELDS_DATA.length-1))*W;
  const sy=v=>H-4-((v-min)/(max-min))*(H-12);
  const linePts=YIELDS_DATA.map((d,i)=>`${i===0?"M":"L"}${sx(i).toFixed(1)},${sy(d.v).toFixed(1)}`).join(" ");
  const areaPts=linePts+` L${W},${H} L0,${H} Z`;
  return (
    <Panel title="Fixed Income" sub="· yield curve">
      <div style={{padding:"12px 14px 8px"}}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",marginBottom:4}}>
          <defs>
            <linearGradient id="ycg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.12"/>
              <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={areaPts} fill="url(#ycg)"/>
          <path d={linePts} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
          {YIELDS_DATA.map((d,i)=>(
            <circle key={d.t} cx={sx(i)} cy={sy(d.v)} r="2.2" fill="#fff"/>
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
        {name:"HY Spread",   val:"342bps",chg:"−8bps",pos:true},
        {name:"IG Spread",   val:"102bps",chg:"−3bps",pos:true},
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

function FedPanel() {
  return (
    <Panel title="Central Banks" sub="· Fed · ECB · BOJ">
      {FED_DATA.map(f=>(
        <Row key={f.label} hover={false}>
          <div style={{flex:1,fontSize:10,color:T.grey400}}>{f.label}</div>
          <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono,marginRight:8}}>{f.val}</div>
          <Badge label={f.status} color={f.ok?T.grey400:T.red}/>
        </Row>
      ))}
      <div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,background:T.surface}}>
        <div style={{fontSize:9,color:T.grey600,marginBottom:5,fontFamily:T.mono,letterSpacing:"0.08em"}}>LATEST FOMC GUIDANCE</div>
        <div style={{fontSize:10,color:T.grey400,lineHeight:1.6,fontStyle:"italic"}}>
          "Committee remains attentive to inflation risks. Rate cuts contingent on sustained progress toward 2% target."
        </div>
      </div>
    </Panel>
  );
}

function BankingPanel() {
  return (
    <Panel title="Banking System" sub="· systemic monitor">
      {BANKS.map(b=>(
        <Row key={b.ticker}>
          <div style={{width:32,fontSize:10,fontWeight:800,color:T.white,fontFamily:T.mono}}>{b.ticker}</div>
          <div style={{flex:1,fontSize:10,color:T.grey400}}>{b.name}</div>
          <div style={{textAlign:"right",marginRight:10}}>
            <div style={{fontSize:10,fontWeight:700,color:T.white,fontFamily:T.mono}}>{b.price}</div>
            <div style={{fontSize:9,color:b.pos?T.green:T.red}}>{b.chg}</div>
          </div>
          <div style={{textAlign:"right",minWidth:52}}>
            <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>CDS</div>
            <div style={{fontSize:10,fontFamily:T.mono,color:b.cds>70?T.amber:T.grey400}}>{b.cds}bps</div>
          </div>
        </Row>
      ))}
    </Panel>
  );
}

function SectorPanel() {
  const mx=Math.max(...SECTORS.map(s=>Math.abs(s.p)));
  return (
    <Panel title="Sector Heatmap" sub="· S&P 500">
      <div style={{padding:"10px 12px",display:"flex",flexWrap:"wrap",gap:4}}>
        {SECTORS.map(s=>{
          const intensity=Math.abs(s.p)/mx;
          const color=s.p>=0?T.green:T.red;
          const bg=s.p>=0
            ?`rgba(34,197,94,${0.06+intensity*0.22})`
            :`rgba(239,68,68,${0.06+intensity*0.22})`;
          return (
            <div key={s.name} style={{
              background:bg,border:`1px solid ${color}20`,borderRadius:4,
              padding:"6px 8px",width:Math.max(70,s.w*3.2),cursor:"pointer",
              transition:"transform 0.1s,border-color 0.1s"
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.borderColor=`${color}50`}}
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

function IpoMaPanel() {
  return (
    <Panel title="IPO / M&A Radar">
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

function EconPanel() {
  return (
    <Panel title="Economic Indicators" sub="· macro data">
      {ECON.map(d=>(
        <Row key={d.label} hover={false}>
          <div style={{flex:1,fontSize:10,color:T.grey400}}>{d.label}</div>
          <div style={{fontSize:11,fontWeight:700,color:T.white,fontFamily:T.mono,marginRight:8}}>{d.val}</div>
          <div style={{fontSize:9,color:T.grey600,marginRight:8,fontFamily:T.mono}}>↵ {d.prev}</div>
          <span style={{fontSize:10,color:d.up?T.green:T.red}}>{d.up?"▲":"▼"}</span>
        </Row>
      ))}
    </Panel>
  );
}

// ── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [time,setTime]=useState(new Date());
  const [popup,setPopup]=useState(null);
  const [activeTab,setActiveTab]=useState("ALL");

  useEffect(()=>{
    const t=setInterval(()=>setTime(new Date()),1000);
    return ()=>clearInterval(t);
  },[]);
  useEffect(()=>{
    const t=setTimeout(()=>setPopup(ALERTS_DATA[2]),2000);
    return ()=>clearTimeout(t);
  },[]);

  const fmt=d=>d.toLocaleTimeString("en-US",{hour12:false});
  const tabs=["ALL","MARKETS","MACRO","FILINGS","BANKING","CRYPTO"];

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
        button,input{font-family:inherit}
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
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:7,
            background:T.surface,border:`1px solid ${T.border}`,
            borderRadius:4,padding:"5px 11px"}}>
            <span style={{fontSize:12,color:T.grey600}}>⌕</span>
            <input placeholder="Ticker, event, filing…" style={{
              background:"none",border:"none",outline:"none",
              color:T.grey200,fontSize:11,width:170}}/>
          </div>
          <div style={{position:"relative",cursor:"pointer",width:34,height:34,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:16,filter:"grayscale(1) brightness(2)"}}>🔔</span>
            <span style={{position:"absolute",top:3,right:3,width:14,height:14,
              borderRadius:"50%",background:T.red,fontSize:8,fontWeight:800,
              display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>5</span>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:T.mono,color:T.white,letterSpacing:"0.04em"}}>{fmt(time)}</div>
            <div style={{fontSize:8,color:T.grey600,fontFamily:T.mono}}>UTC−5 · NYSE OPEN</div>
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
              <span style={{color:T.grey600}}>{m.name||m.pair||m.sym}</span>
              <span style={{color:T.white}}>{m.val}</span>
              <span style={{color:m.pos?T.green:T.red}}>{m.chg}</span>
            </span>
          ))}
        </div>
      </div>

      {/* MAP */}
      <div style={{height:420,borderBottom:`1px solid ${T.border}`,position:"relative"}}>
        <WorldMap/>
        <div style={{position:"absolute",top:0,left:0,right:0,padding:"10px 16px",
          display:"flex",alignItems:"center",gap:10,zIndex:5,pointerEvents:"none",
          background:"linear-gradient(180deg,rgba(0,0,0,0.65) 0%,transparent 100%)"}}>
          <span style={{fontSize:10,fontWeight:700,color:T.white,letterSpacing:"0.14em",fontFamily:T.mono}}>
            GLOBAL FINANCIAL MAP
          </span>
          <LiveDot size={5} color={T.green}/>
        </div>
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

      {/* GRID */}
      <div style={{padding:12,display:"grid",gap:10,
        gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))"}}>
        <MarketsPanel/><NewsPanel/><AlertsPanel/><SECPanel/>
        <CommoditiesPanel/><ForexPanel/><CryptoPanel/><FixedIncomePanel/>
        <FedPanel/><BankingPanel/><SectorPanel/><IpoMaPanel/><EconPanel/>
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
          FINTEL v2.0 · ALL SYSTEMS NOMINAL · DATA SIMULATED
        </span>
        <span style={{marginLeft:"auto",fontSize:9,color:T.grey600}}>
          Connect: FRED · SEC EDGAR · CME · Polygon.io · Bloomberg
        </span>
      </footer>
    </div>
  );
}
