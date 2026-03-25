// FINTEL COMMAND - All data constants (TypeScript)
// Types imported from @/types

import type {
  MarketIndex, Commodity, ForexPair, CryptoAsset, YieldPoint,
  NewsItem, Alert, Filing, Sector, Bank, CentralBankRate, EconIndicator,
  OptionsFlow, MacroEvent, VolatilityItem, InsiderTrade, EarningsItem,
  DarkPoolTrade, GeopoliticalEvent, IpoMaItem, HeatmapSector, HistoricalYear,
  ETF, BondRatings, FedMeeting, ShortStock, BreadthData,
  CountryIntel, FinancialNode, Cable, Pipeline,
} from '@/types';

// ── Country Intelligence ──────────────────────────────────────────────────────
export const COUNTRY_DATA: Record<string, CountryIntel> = {
  "United States":       {code:"US",gdp:"$27.4T",gdpGrowth:"+2.5%",inflation:"3.4%", rate:"5.25%", index:"S&P 500",  indexVal:"5,842",  indexChg:"+0.82%",debt:"122%",rating:"AA+", pos:true, signals:["Fed Hold","Strong Jobs","AI Boom"],risk:22},
  "China":               {code:"CN",gdp:"$17.7T",gdpGrowth:"+4.6%",inflation:"0.1%", rate:"3.45%", index:"CSI 300",  indexVal:"3,421",  indexChg:"-0.92%",debt:"83%", rating:"A+",  pos:false,signals:["Deflation Risk","Property Crisis","PBOC Easing"],risk:58},
  "Germany":             {code:"DE",gdp:"$4.5T", gdpGrowth:"-0.2%",inflation:"2.5%", rate:"4.50%", index:"DAX",      indexVal:"18,903", indexChg:"+0.55%",debt:"66%", rating:"AAA", pos:true, signals:["Recession Risk","Energy Shock","Auto Slowdown"],risk:35},
  "Japan":               {code:"JP",gdp:"$4.2T", gdpGrowth:"+0.4%",inflation:"2.8%", rate:"0.10%", index:"Nikkei",   indexVal:"38,201", indexChg:"-0.41%",debt:"261%",rating:"A",   pos:false,signals:["BOJ Pivot","Weak Yen","Aging Pop"],risk:42},
  "United Kingdom":      {code:"GB",gdp:"$3.1T", gdpGrowth:"+0.1%",inflation:"3.4%", rate:"5.25%", index:"FTSE 100", indexVal:"8,421",  indexChg:"+0.21%",debt:"101%",rating:"AA",  pos:true, signals:["Sticky Inflation","BoE Hold","Housing Stress"],risk:38},
  "France":              {code:"FR",gdp:"$3.0T", gdpGrowth:"+0.7%",inflation:"2.3%", rate:"4.50%", index:"CAC 40",   indexVal:"8,052",  indexChg:"+0.44%",debt:"111%",rating:"AA",  pos:true, signals:["Fiscal Deficit","Olympic Boost","ECB Pivot"],risk:41},
  "India":               {code:"IN",gdp:"$3.7T", gdpGrowth:"+6.8%",inflation:"5.1%", rate:"6.50%", index:"SENSEX",   indexVal:"73,104", indexChg:"+0.67%",debt:"84%", rating:"BBB-",pos:true, signals:["EM Outperformer","FDI Surge","Digital Growth"],risk:28},
  "Canada":              {code:"CA",gdp:"$2.1T", gdpGrowth:"+1.1%",inflation:"2.9%", rate:"5.00%", index:"TSX",      indexVal:"21,834", indexChg:"+0.61%",debt:"107%",rating:"AAA", pos:true, signals:["Housing Bubble","Oil Tailwind","BoC Cut Path"],risk:30},
  "Brazil":              {code:"BR",gdp:"$2.1T", gdpGrowth:"+2.9%",inflation:"4.5%", rate:"10.75%",index:"IBOVESPA", indexVal:"128,422",indexChg:"-0.33%",debt:"89%", rating:"BB",  pos:false,signals:["Fiscal Risk","Commodity Play","EM Volatility"],risk:62},
  "Australia":           {code:"AU",gdp:"$1.7T", gdpGrowth:"+1.5%",inflation:"3.4%", rate:"4.35%", index:"ASX 200",  indexVal:"7,812",  indexChg:"+0.44%",debt:"48%", rating:"AAA", pos:true, signals:["China Exposure","Rate Peak","Resource Boom"],risk:24},
  "South Korea":         {code:"KR",gdp:"$1.7T", gdpGrowth:"+2.3%",inflation:"2.6%", rate:"3.50%", index:"KOSPI",    indexVal:"2,641",  indexChg:"+0.82%",debt:"53%", rating:"AA",  pos:true, signals:["Semi Cycle","K-Export","BOK Hold"],risk:27},
  "Russia":              {code:"RU",gdp:"$1.9T", gdpGrowth:"+3.2%",inflation:"7.4%", rate:"16.0%", index:"MOEX",     indexVal:"3,312",  indexChg:"+1.24%",debt:"21%", rating:"NR",  pos:false,signals:["Sanctions","War Economy","Energy Revenue"],risk:88},
  "Saudi Arabia":        {code:"SA",gdp:"$1.1T", gdpGrowth:"+1.7%",inflation:"1.6%", rate:"6.00%", index:"TADAWUL",  indexVal:"12,041", indexChg:"+1.12%",debt:"24%", rating:"A",   pos:true, signals:["Oil Policy","Vision 2030","OPEC+ Control"],risk:31},
  "South Africa":        {code:"ZA",gdp:"$0.4T", gdpGrowth:"+0.6%",inflation:"5.3%", rate:"8.25%", index:"JSE",      indexVal:"73,241", indexChg:"+0.15%",debt:"74%", rating:"BB-", pos:false,signals:["Load Shedding","Political Risk","Mining Output"],risk:71},
  "Singapore":           {code:"SG",gdp:"$0.5T", gdpGrowth:"+2.2%",inflation:"2.9%", rate:"N/A",   index:"STI",      indexVal:"3,204",  indexChg:"+0.08%",debt:"160%",rating:"AAA", pos:true, signals:["Trade Hub","Wealth Mgmt","MAS Steady"],risk:14},
  "Switzerland":         {code:"CH",gdp:"$0.9T", gdpGrowth:"+1.2%",inflation:"1.3%", rate:"1.50%", index:"SMI",      indexVal:"11,521", indexChg:"+0.22%",debt:"42%", rating:"AAA", pos:true, signals:["CHF Safe Haven","SNB Cut","Banking Hub"],risk:11},
  "United Arab Emirates":{code:"AE",gdp:"$0.5T", gdpGrowth:"+4.0%",inflation:"2.3%", rate:"5.40%", index:"DFM",      indexVal:"4,121",  indexChg:"+1.12%",debt:"27%", rating:"AA",  pos:true, signals:["Oil Wealth","FinHub Growth","Tourism Boom"],risk:19},
  "Mexico":              {code:"MX",gdp:"$1.3T", gdpGrowth:"+2.5%",inflation:"4.4%", rate:"11.00%",index:"IPC",      indexVal:"55,242", indexChg:"+0.38%",debt:"49%", rating:"BBB", pos:true, signals:["Nearshoring Boom","Banxico Cuts","US Trade Link"],risk:36},
  "Argentina":           {code:"AR",gdp:"$0.6T", gdpGrowth:"-2.5%",inflation:"276%", rate:"100%",  index:"MERVAL",   indexVal:"1,124K", indexChg:"-1.80%",debt:"144%",rating:"CC",  pos:false,signals:["Hyperinflation","IMF Program","Dollarization"],risk:97},
  "Turkey":              {code:"TR",gdp:"$1.1T", gdpGrowth:"+4.5%",inflation:"68%",  rate:"50.0%", index:"BIST 100", indexVal:"9,841",  indexChg:"-0.72%",debt:"33%", rating:"B",   pos:false,signals:["Currency Crisis","Erdogan Policy","Inflation"],risk:79},
  "Iran":                {code:"IR",gdp:"$0.4T", gdpGrowth:"+4.7%",inflation:"42%",  rate:"23.0%", index:"TSE",      indexVal:"2,041K", indexChg:"-1.20%",debt:"38%", rating:"NR",  pos:false,signals:["Sanctions","Oil Evasion","Geopolitical Risk"],risk:91},
  "Nigeria":             {code:"NG",gdp:"$0.4T", gdpGrowth:"+3.2%",inflation:"31%",  rate:"24.75%",index:"NGX",      indexVal:"97,241", indexChg:"-2.10%",debt:"39%", rating:"B-",  pos:false,signals:["FX Crisis","Oil Dependent","Debt Restructure"],risk:82},
  "Indonesia":           {code:"ID",gdp:"$1.4T", gdpGrowth:"+5.1%",inflation:"2.8%", rate:"6.25%", index:"IDX",      indexVal:"7,284",  indexChg:"+0.52%",debt:"39%", rating:"BBB", pos:true, signals:["Resource Rich","EM Growth","BI Steady"],risk:32},
  "Netherlands":         {code:"NL",gdp:"$1.0T", gdpGrowth:"+0.5%",inflation:"2.9%", rate:"4.50%", index:"AEX",      indexVal:"881",    indexChg:"+0.38%",debt:"50%", rating:"AAA", pos:true, signals:["Trade Hub","Shell HQ","ECB Linked"],risk:18},
  "Spain":               {code:"ES",gdp:"$1.6T", gdpGrowth:"+2.1%",inflation:"2.8%", rate:"4.50%", index:"IBEX 35",  indexVal:"10,841", indexChg:"+0.62%",debt:"109%",rating:"A",   pos:true, signals:["Tourism Recovery","ECB Pivot","Debt Watch"],risk:33},
  "Italy":               {code:"IT",gdp:"$2.2T", gdpGrowth:"+0.9%",inflation:"1.2%", rate:"4.50%", index:"FTSE MIB", indexVal:"33,241", indexChg:"+0.41%",debt:"143%",rating:"BBB", pos:true, signals:["Debt Burden","ECB Backstop","PNRR Funds"],risk:44},
  "Norway":              {code:"NO",gdp:"$0.5T", gdpGrowth:"+2.0%",inflation:"3.9%", rate:"4.50%", index:"OBX",      indexVal:"1,241",  indexChg:"+0.55%",debt:"40%", rating:"AAA", pos:true, signals:["Oil Fund","Sovereign Wealth","Energy Export"],risk:9},
  "Poland":              {code:"PL",gdp:"$0.8T", gdpGrowth:"+2.8%",inflation:"3.7%", rate:"5.75%", index:"WIG20",    indexVal:"2,412",  indexChg:"+0.74%",debt:"49%", rating:"A-",  pos:true, signals:["EU Funds","Defense Spend","Nearshoring"],risk:26},
  "Sweden":              {code:"SE",gdp:"$0.6T", gdpGrowth:"+0.5%",inflation:"3.5%", rate:"4.00%", index:"OMX",      indexVal:"2,380",  indexChg:"+0.48%",debt:"33%", rating:"AAA", pos:true, signals:["Krona Weak","Riksbank Hold","Property Stress"],risk:21},
  "Belgium":             {code:"BE",gdp:"$0.6T", gdpGrowth:"+1.2%",inflation:"2.7%", rate:"4.50%", index:"BEL 20",   indexVal:"3,892",  indexChg:"+0.33%",debt:"108%",rating:"AA",  pos:true, signals:["ECB Linked","Coalition Risk","Fiscal Drift"],risk:32},
  "Austria":             {code:"AT",gdp:"$0.5T", gdpGrowth:"-0.1%",inflation:"3.2%", rate:"4.50%", index:"ATX",      indexVal:"3,521",  indexChg:"+0.28%",debt:"77%", rating:"AA+", pos:true, signals:["Energy Shock","ECB Linked","Stable Banking"],risk:28},
  "Denmark":             {code:"DK",gdp:"$0.4T", gdpGrowth:"+1.8%",inflation:"2.2%", rate:"3.85%", index:"OMX C25",  indexVal:"2,041",  indexChg:"+0.62%",debt:"29%", rating:"AAA", pos:true, signals:["Pharma Leader","Low Debt","Stable Krone"],risk:12},
  "Finland":             {code:"FI",gdp:"$0.3T", gdpGrowth:"-0.5%",inflation:"2.6%", rate:"4.50%", index:"OMX H",    indexVal:"12,841", indexChg:"+0.21%",debt:"74%", rating:"AA+", pos:true, signals:["NATO Integration","Nordic Stability","ECB Linked"],risk:18},
  "Ireland":             {code:"IE",gdp:"$0.5T", gdpGrowth:"+4.2%",inflation:"2.4%", rate:"4.50%", index:"ISEQ",     indexVal:"9,842",  indexChg:"+0.55%",debt:"44%", rating:"AA-", pos:true, signals:["Tech Hub","Low Corp Tax","FDI Magnet"],risk:16},
  "Portugal":            {code:"PT",gdp:"$0.3T", gdpGrowth:"+2.3%",inflation:"2.8%", rate:"4.50%", index:"PSI",      indexVal:"6,924",  indexChg:"+0.44%",debt:"99%", rating:"BBB+",pos:true, signals:["Tourism Boom","Golden Visa","ECB Backstop"],risk:29},
  "Greece":              {code:"GR",gdp:"$0.2T", gdpGrowth:"+2.4%",inflation:"2.9%", rate:"4.50%", index:"ASE",      indexVal:"1,481",  indexChg:"+0.82%",debt:"171%",rating:"BBB-",pos:true, signals:["Tourism Recovery","Debt Watch","IMF Exit"],risk:38},
  "Czech Republic":      {code:"CZ",gdp:"$0.3T", gdpGrowth:"+1.4%",inflation:"2.1%", rate:"4.75%", index:"PX",       indexVal:"1,584",  indexChg:"+0.62%",debt:"44%", rating:"AA-", pos:true, signals:["EU Integration","Auto Sector","CNB Easing"],risk:20},
  "Romania":             {code:"RO",gdp:"$0.3T", gdpGrowth:"+2.2%",inflation:"5.8%", rate:"7.00%", index:"BET",      indexVal:"18,241", indexChg:"+0.41%",debt:"51%", rating:"BBB-",pos:true, signals:["EU Funds","Rate High","Political Risk"],risk:35},
  "Hungary":             {code:"HU",gdp:"$0.2T", gdpGrowth:"+1.8%",inflation:"4.2%", rate:"8.25%", index:"BUX",      indexVal:"71,241", indexChg:"+0.55%",debt:"73%", rating:"BBB", pos:true, signals:["Orban Policy","Rate Cuts","EU Funds Blocked"],risk:42},
  "Ukraine":             {code:"UA",gdp:"$0.2T", gdpGrowth:"-5.0%",inflation:"7.1%", rate:"14.5%", index:"PFTS",     indexVal:"841",    indexChg:"-3.20%",debt:"84%", rating:"CC",  pos:false,signals:["War Economy","IMF Support","Reconstruction"],risk:96},
  "Egypt":               {code:"EG",gdp:"$0.4T", gdpGrowth:"+3.8%",inflation:"33%",  rate:"27.25%",index:"EGX 30",   indexVal:"28,104", indexChg:"-1.42%",debt:"92%", rating:"B-",  pos:false,signals:["FX Devaluation","IMF Deal","Suez Revenue"],risk:76},
  "Morocco":             {code:"MA",gdp:"$0.1T", gdpGrowth:"+3.2%",inflation:"2.5%", rate:"3.00%", index:"MASI",     indexVal:"13,241", indexChg:"+0.44%",debt:"71%", rating:"BB+", pos:true, signals:["Green Energy","Phosphate Hub","Africa Growth"],risk:33},
  "Algeria":             {code:"DZ",gdp:"$0.2T", gdpGrowth:"+4.1%",inflation:"6.8%", rate:"N/A",   index:"N/A",      indexVal:"N/A",    indexChg:"N/A",   debt:"57%", rating:"NR",  pos:false,signals:["Gas Export","No Reform","Political Stagnation"],risk:61},
  "Ethiopia":            {code:"ET",gdp:"$0.1T", gdpGrowth:"+7.5%",inflation:"22%",  rate:"N/A",   index:"N/A",      indexVal:"N/A",    indexChg:"N/A",   debt:"57%", rating:"CCC+",pos:false,signals:["Growth Story","Debt Distress","Political Conflict"],risk:68},
  "Kenya":               {code:"KE",gdp:"$0.1T", gdpGrowth:"+5.0%",inflation:"6.3%", rate:"13.00%",index:"NSE 20",   indexVal:"1,682",  indexChg:"-0.38%",debt:"68%", rating:"B",   pos:false,signals:["Debt Distress","Tech Hub","IMF Program"],risk:65},
  "Ghana":               {code:"GH",gdp:"$0.07T",gdpGrowth:"+3.8%",inflation:"23%",  rate:"29.00%",index:"GSE",      indexVal:"4,124",  indexChg:"-0.92%",debt:"90%", rating:"SD",  pos:false,signals:["Default 2022","IMF Bailout","Gold/Cocoa"],risk:78},
  "Angola":              {code:"AO",gdp:"$0.09T",gdpGrowth:"+4.0%",inflation:"22%",  rate:"18.00%",index:"BVB",      indexVal:"N/A",    indexChg:"N/A",   debt:"88%", rating:"B-",  pos:false,signals:["Oil Dependent","FX Pressure","IMF Program"],risk:69},
  "Tanzania":            {code:"TZ",gdp:"$0.08T",gdpGrowth:"+5.2%",inflation:"3.1%", rate:"5.50%", index:"DSE",      indexVal:"2,841",  indexChg:"+0.21%",debt:"38%", rating:"B+",  pos:true, signals:["Natural Gas","Tourism","Stable Growth"],risk:36},
  "Zambia":              {code:"ZM",gdp:"$0.03T",gdpGrowth:"+4.2%",inflation:"13%",  rate:"14.00%",index:"LuSE",     indexVal:"N/A",    indexChg:"N/A",   debt:"120%",rating:"SD",  pos:false,signals:["Debt Restructuring","Copper","IMF Program"],risk:75},
  "Zimbabwe":            {code:"ZW",gdp:"$0.02T",gdpGrowth:"+5.3%",inflation:"40%",  rate:"N/A",   index:"ZSE",      indexVal:"N/A",    indexChg:"N/A",   debt:"100%",rating:"SD",  pos:false,signals:["Currency Crisis","Sanctions","Tobacco"],risk:85},
  "Botswana":            {code:"BW",gdp:"$0.02T",gdpGrowth:"+3.5%",inflation:"3.1%", rate:"2.65%", index:"BSE",      indexVal:"N/A",    indexChg:"N/A",   debt:"19%", rating:"BBB+",pos:true, signals:["Diamond Hub","Low Debt","Stable Governance"],risk:18},
  "Namibia":             {code:"NA",gdp:"$0.01T",gdpGrowth:"+4.4%",inflation:"5.1%", rate:"7.75%", index:"NSX",      indexVal:"N/A",    indexChg:"N/A",   debt:"68%", rating:"BB-", pos:true, signals:["Oil Discovery","Mining","SA Linked"],risk:34},
  "Democratic Republic of the Congo":{code:"CD",gdp:"$0.06T",gdpGrowth:"+7.5%",inflation:"17%",rate:"N/A",index:"N/A",indexVal:"N/A",indexChg:"N/A",debt:"17%",rating:"NR",pos:false,signals:["Mineral Wealth","Conflict","No Market"],risk:82},
  "Sudan":               {code:"SD",gdp:"$0.03T",gdpGrowth:"-12%", inflation:"63%",  rate:"N/A",   index:"N/A",      indexVal:"N/A",    indexChg:"N/A",   debt:"180%",rating:"NR",  pos:false,signals:["Civil War","Sanctions","Oil Lost"],risk:97},
  "Pakistan":            {code:"PK",gdp:"$0.4T", gdpGrowth:"+2.0%",inflation:"24%",  rate:"22.00%",index:"KSE 100",  indexVal:"71,241", indexChg:"-0.42%",debt:"87%", rating:"CCC+",pos:false,signals:["IMF Bailout","FX Crisis","Political Chaos"],risk:83},
  "Bangladesh":          {code:"BD",gdp:"$0.5T", gdpGrowth:"+5.8%",inflation:"9.7%", rate:"8.50%", index:"DSEX",     indexVal:"5,421",  indexChg:"-0.64%",debt:"39%", rating:"BB-", pos:false,signals:["Garment Export","FX Pressure","Reform Push"],risk:52},
  "Malaysia":            {code:"MY",gdp:"$0.4T", gdpGrowth:"+4.2%",inflation:"1.8%", rate:"3.00%", index:"KLCI",     indexVal:"1,542",  indexChg:"+0.31%",debt:"65%", rating:"A-",  pos:true, signals:["Semi Hub","Palm Oil","BNM Steady"],risk:25},
  "Thailand":            {code:"TH",gdp:"$0.5T", gdpGrowth:"+2.5%",inflation:"0.6%", rate:"2.50%", index:"SET",      indexVal:"1,381",  indexChg:"-0.18%",debt:"62%", rating:"BBB+",pos:false,signals:["Tourism Recovery","Political Risk","BOT Cut"],risk:34},
  "Vietnam":             {code:"VN",gdp:"$0.4T", gdpGrowth:"+6.5%",inflation:"3.2%", rate:"4.50%", index:"VN-Index", indexVal:"1,284",  indexChg:"+0.92%",debt:"37%", rating:"BB",  pos:true, signals:["FDI Magnet","Mfg Shift","Export Boom"],risk:30},
  "Philippines":         {code:"PH",gdp:"$0.4T", gdpGrowth:"+5.6%",inflation:"3.5%", rate:"6.50%", index:"PSEi",     indexVal:"6,741",  indexChg:"+0.28%",debt:"61%", rating:"BBB+",pos:true, signals:["Remittances","BPO Growth","BSP Hold"],risk:35},
  "Colombia":            {code:"CO",gdp:"$0.3T", gdpGrowth:"+1.2%",inflation:"7.2%", rate:"11.75%",index:"COLCAP",   indexVal:"1,284",  indexChg:"+0.42%",debt:"55%", rating:"BB+", pos:true, signals:["Oil Revenue","Reform Risk","EM Carry"],risk:48},
  "Chile":               {code:"CL",gdp:"$0.3T", gdpGrowth:"+2.0%",inflation:"3.8%", rate:"6.50%", index:"IPSA",     indexVal:"6,842",  indexChg:"+0.58%",debt:"38%", rating:"A",   pos:true, signals:["Copper Play","Lithium Boom","BCCh Cuts"],risk:29},
  "Peru":                {code:"PE",gdp:"$0.2T", gdpGrowth:"+2.5%",inflation:"2.8%", rate:"5.75%", index:"S&P/BVL",  indexVal:"21,842", indexChg:"+0.44%",debt:"33%", rating:"BBB", pos:true, signals:["Copper Export","Political Risk","BCRP Cuts"],risk:38},
  "Venezuela":           {code:"VE",gdp:"$0.1T", gdpGrowth:"+5.0%",inflation:"200%", rate:"N/A",   index:"IBVC",     indexVal:"N/A",    indexChg:"N/A",   debt:"150%",rating:"SD",  pos:false,signals:["Sanctions","Oil Decline","Hyperinflation"],risk:98},
  "New Zealand":         {code:"NZ",gdp:"$0.2T", gdpGrowth:"+0.6%",inflation:"4.0%", rate:"5.50%", index:"NZX 50",   indexVal:"11,841", indexChg:"+0.31%",debt:"45%", rating:"AA+", pos:true, signals:["RBNZ Cuts","Housing Cool","Tourism"],risk:16},
  "Kazakhstan":          {code:"KZ",gdp:"$0.3T", gdpGrowth:"+4.8%",inflation:"9.0%", rate:"14.75%",index:"KASE",     indexVal:"5,241",  indexChg:"+0.44%",debt:"25%", rating:"BBB", pos:true, signals:["Oil Rich","Low Debt","Steppe Route"],risk:31},
  "Iraq":                {code:"IQ",gdp:"$0.3T", gdpGrowth:"+3.4%",inflation:"3.8%", rate:"N/A",   index:"ISX",      indexVal:"N/A",    indexChg:"N/A",   debt:"44%", rating:"B-",  pos:false,signals:["Oil Dependent","Security Risk","Corruption"],risk:74},
  "Kuwait":              {code:"KW",gdp:"$0.2T", gdpGrowth:"+0.6%",inflation:"3.5%", rate:"4.25%", index:"Boursa",   indexVal:"7,241",  indexChg:"+0.44%",debt:"4%",  rating:"A+",  pos:true, signals:["Sovereign Wealth","Oil Wealth","Low Debt"],risk:22},
  "Qatar":               {code:"QA",gdp:"$0.2T", gdpGrowth:"+1.5%",inflation:"1.9%", rate:"5.25%", index:"QE",       indexVal:"10,241", indexChg:"+0.62%",debt:"41%", rating:"AA",  pos:true, signals:["LNG Export","World Cup Legacy","Low Risk"],risk:18},
  "Libya":               {code:"LY",gdp:"$0.04T",gdpGrowth:"+5.0%",inflation:"2.8%", rate:"N/A",   index:"N/A",      indexVal:"N/A",    indexChg:"N/A",   debt:"4%",  rating:"NR",  pos:false,signals:["Oil Wealth","Political Fragmentation","Security Risk"],risk:80},
  "Tunisia":             {code:"TN",gdp:"$0.05T",gdpGrowth:"+0.4%",inflation:"7.5%", rate:"8.00%", index:"BVMT",     indexVal:"7,841",  indexChg:"-0.38%",debt:"80%", rating:"CCC", pos:false,signals:["IMF Stalled","Political Risk","FX Pressure"],risk:77},
  "Lebanon":             {code:"LB",gdp:"$0.02T",gdpGrowth:"-5.0%",inflation:"100%", rate:"N/A",   index:"BSE",      indexVal:"N/A",    indexChg:"N/A",   debt:"180%",rating:"SD",  pos:false,signals:["Default","Banking Crisis","Political Paralysis"],risk:99},
  "Syria":               {code:"SY",gdp:"N/A",   gdpGrowth:"N/A",  inflation:"N/A",  rate:"N/A",   index:"N/A",      indexVal:"N/A",    indexChg:"N/A",   debt:"N/A", rating:"NR",  pos:false,signals:["Conflict","Sanctions","Reconstruction Phase"],risk:95},
  "Yemen":               {code:"YE",gdp:"N/A",   gdpGrowth:"N/A",  inflation:"N/A",  rate:"N/A",   index:"N/A",      indexVal:"N/A",    indexChg:"N/A",   debt:"N/A", rating:"NR",  pos:false,signals:["Civil War","Humanitarian Crisis","No Market"],risk:100},
  "Myanmar":             {code:"MM",gdp:"$0.07T",gdpGrowth:"-3.0%",inflation:"25%",  rate:"N/A",   index:"YSX",      indexVal:"N/A",    indexChg:"N/A",   debt:"65%", rating:"NR",  pos:false,signals:["Military Coup","Sanctions","Civil War"],risk:91},
  "Mongolia":            {code:"MN",gdp:"$0.02T",gdpGrowth:"+7.0%",inflation:"7.8%", rate:"13.00%",index:"MSE",      indexVal:"N/A",    indexChg:"N/A",   debt:"77%", rating:"B-",  pos:false,signals:["Coal Dependent","China Exposure","Mining Boom"],risk:55},
};

// ── Financial Map Nodes ───────────────────────────────────────────────────────
export const FIN_NODES: FinancialNode[] = [
  {id:"nyc",name:"New York",   lon:-74.0,lat:40.7, perf:+0.82,type:"exchange"},
  {id:"tor",name:"Toronto",    lon:-79.4,lat:43.7, perf:+0.61,type:"exchange"},
  {id:"lon",name:"London",     lon:-0.1, lat:51.5, perf:+0.31,type:"central"},
  {id:"fra",name:"Frankfurt",  lon:8.7,  lat:50.1, perf:+0.54,type:"central"},
  {id:"zur",name:"Zurich",     lon:8.5,  lat:47.4, perf:+0.22,type:"central"},
  {id:"dxb",name:"Dubai",      lon:55.3, lat:25.2, perf:+1.12,type:"commodity"},
  {id:"mum",name:"Mumbai",     lon:72.9, lat:19.1, perf:+0.67,type:"exchange"},
  {id:"sha",name:"Shanghai",   lon:121.5,lat:31.2, perf:-0.92,type:"exchange"},
  {id:"hkg",name:"Hong Kong",  lon:114.2,lat:22.3, perf:-1.18,type:"exchange"},
  {id:"tok",name:"Tokyo",      lon:139.7,lat:35.7, perf:-0.41,type:"exchange"},
  {id:"sgp",name:"Singapore",  lon:103.8,lat:1.3,  perf:+0.08,type:"exchange"},
  {id:"syd",name:"Sydney",     lon:151.2,lat:-33.9,perf:+0.44,type:"exchange"},
  {id:"sao",name:"São Paulo",  lon:-46.6,lat:-23.5,perf:-0.33,type:"exchange"},
  {id:"joh",name:"Johannesburg",lon:28.0,lat:-26.2,perf:+0.15,type:"exchange"},
];

// ── Capital Flow Pairs ────────────────────────────────────────────────────────
export const FLOW_PAIRS: [string, string][] = [
  ["nyc","lon"],["nyc","tok"],["nyc","tor"],["nyc","sao"],
  ["lon","fra"],["lon","dxb"],["lon","zur"],["fra","zur"],
  ["tok","sha"],["tok","hkg"],["sha","hkg"],["hkg","sgp"],
  ["dxb","mum"],["sgp","syd"],["lon","joh"],
];

// ── Infrastructure Overlays ───────────────────────────────────────────────────
export const CABLES: Cable[] = [
  {color:"#7c3aed",pts:[[-74,41],[-52,48],[-15,52],[0,51]]},
  {color:"#7c3aed",pts:[[-74,40],[-45,42],[-10,50],[0,51]]},
  {color:"#2563eb",pts:[[0,51],[10,37],[32,30],[55,25],[72,19],[104,1],[114,22],[140,36]]},
  {color:"#2563eb",pts:[[-74,40],[-130,40],[-145,42],[140,36]]},
  {color:"#0891b2",pts:[[151,-34],[178,-38],[-160,36],[-74,40]]},
];
export const PIPELINES: Pipeline[] = [
  {color:"#ea580c",pts:[[37,56],[60,57],[80,60],[104,52],[122,50]]},
  {color:"#ea580c",pts:[[28,60],[18,56],[10,57],[8,54]]},
  {color:"#ea580c",pts:[[-111,50],[-97,46],[-96,36],[-95,30]]},
  {color:"#d97706",pts:[[50,26],[45,24],[37,14],[43,13]]},
  {color:"#ea580c",pts:[[37,52],[28,52],[20,51],[14,52],[10,51],[8,50]]},
];

export const MARKETS: MarketIndex[] = [
  {name:"S&P 500",   val:"5,842.3",  chg:"+0.82%", pos:true,  seed:11, mktCap:"$46.2T", pe:"23.4"},
  {name:"NASDAQ",    val:"18,421.7", chg:"+1.14%", pos:true,  seed:22, mktCap:"$22.1T", pe:"31.2"},
  {name:"DOW",       val:"43,120.5", chg:"+0.43%", pos:true,  seed:33, mktCap:"$14.8T", pe:"19.8"},
  {name:"VIX",       val:"18.42",    chg:"-2.31%", pos:false, seed:44, mktCap:"—",      pe:"—"},
  {name:"Russell 2K",val:"2,234.1",  chg:"+0.67%", pos:true,  seed:55, mktCap:"$3.1T",  pe:"18.2"},
  {name:"DAX",       val:"18,903.4", chg:"+0.55%", pos:true,  seed:66, mktCap:"$2.1T",  pe:"15.1"},
  {name:"FTSE 100",  val:"8,421.2",  chg:"+0.21%", pos:true,  seed:77, mktCap:"$2.8T",  pe:"11.4"},
  {name:"Nikkei",    val:"38,201.4", chg:"-0.38%", pos:false, seed:88, mktCap:"$6.0T",  pe:"21.3"},
  {name:"CAC 40",    val:"8,052.1",  chg:"+0.44%", pos:true,  seed:91, mktCap:"$2.3T",  pe:"14.8"},
  {name:"Hang Seng", val:"17,284.5", chg:"-1.12%", pos:false, seed:92, mktCap:"$3.1T",  pe:"8.9"},
];

export const COMMODITIES: Commodity[] = [
  {name:"WTI Crude", val:"$71.24", chg:"+1.24%", pos:true,  unit:"bbl",    seed:101, wk:"$68.10", yr:"$84.20"},
  {name:"Brent",     val:"$75.81", chg:"+1.18%", pos:true,  unit:"bbl",    seed:102, wk:"$72.50", yr:"$88.40"},
  {name:"Gold",      val:"$2,312", chg:"+0.44%", pos:true,  unit:"oz",     seed:103, wk:"$2,290", yr:"$1,980"},
  {name:"Silver",    val:"$27.84", chg:"+0.82%", pos:true,  unit:"oz",     seed:104, wk:"$27.10", yr:"$22.80"},
  {name:"Copper",    val:"$4.21",  chg:"-0.56%", pos:false, unit:"lb",     seed:105, wk:"$4.28",  yr:"$3.91"},
  {name:"Nat. Gas",  val:"$2.84",  chg:"-1.23%", pos:false, unit:"mmBtu",  seed:106, wk:"$2.94",  yr:"$3.42"},
  {name:"Wheat",     val:"$548",   chg:"-0.34%", pos:false, unit:"bushel", seed:107, wk:"$552",   yr:"$642"},
  {name:"Uranium",   val:"$91.20", chg:"+2.14%", pos:true,  unit:"lb",     seed:108, wk:"$89.40", yr:"$51.80"},
];

export const FOREX: ForexPair[] = [
  {pair:"EUR/USD",val:"1.0842",chg:"-0.12%",pos:false,seed:201},
  {pair:"USD/JPY",val:"149.82",chg:"+0.34%",pos:true, seed:202},
  {pair:"GBP/USD",val:"1.2634",chg:"+0.08%",pos:true, seed:203},
  {pair:"DXY",    val:"104.42",chg:"+0.18%",pos:true, seed:204},
  {pair:"AUD/USD",val:"0.6534",chg:"+0.22%",pos:true, seed:205},
  {pair:"USD/CHF",val:"0.8921",chg:"-0.05%",pos:false,seed:206},
  {pair:"USD/CNY",val:"7.2415",chg:"+0.11%",pos:true, seed:207},
  {pair:"USD/BRL",val:"4.9820",chg:"+0.44%",pos:true, seed:208},
];

export const CRYPTO: CryptoAsset[] = [
  {sym:"BTC",name:"Bitcoin",  val:"$67,234",chg:"+2.84%",pos:true, seed:301,dom:"53.2%",mcap:"$1.32T"},
  {sym:"ETH",name:"Ethereum", val:"$3,421", chg:"+3.12%",pos:true, seed:302,dom:"17.1%",mcap:"$411B"},
  {sym:"SOL",name:"Solana",   val:"$182.40",chg:"+4.21%",pos:true, seed:303,dom:"3.1%", mcap:"$82B"},
  {sym:"XRP",name:"XRP",      val:"$0.584", chg:"-0.82%",pos:false,seed:304,dom:"2.8%", mcap:"$33B"},
  {sym:"BNB",name:"BNB",      val:"$412.30",chg:"+1.44%",pos:true, seed:305,dom:"2.1%", mcap:"$62B"},
  {sym:"DOGE",name:"Dogecoin",val:"$0.182", chg:"-1.32%",pos:false,seed:306,dom:"1.2%", mcap:"$26B"},
];

export const YIELDS_DATA: YieldPoint[] = [
  {t:"1M",v:5.28},{t:"3M",v:5.31},{t:"6M",v:5.18},
  {t:"1Y",v:5.02},{t:"2Y",v:4.82},{t:"5Y",v:4.62},
  {t:"10Y",v:4.42},{t:"30Y",v:4.61},
];

export const NEWS: NewsItem[] = [
  {time:"09:42",sev:"high",  title:"Fed officials signal rate hold through Q2 amid persistent inflation data",src:"Reuters",tag:"MACRO"},
  {time:"09:31",sev:"medium",title:"JPMorgan Q1 earnings beat estimates; investment banking revenue surges 21%",src:"Bloomberg",tag:"EARNINGS"},
  {time:"09:18",sev:"low",   title:"Oil rises on Middle East supply concerns and stronger demand outlook from IEA",src:"WSJ",tag:"COMMODITY"},
  {time:"08:55",sev:"medium",title:"China PMI contracts for second consecutive month, raising growth concerns",src:"FT",tag:"MACRO"},
  {time:"08:44",sev:"high",  title:"Regional bank index falls 2.3% premarket on commercial real estate fears",src:"CNBC",tag:"BANKING"},
  {time:"08:22",sev:"low",   title:"ECB holds rates, signals summer cut still on table pending data",src:"Reuters",tag:"CENTRAL BANK"},
  {time:"07:58",sev:"medium",title:"Nvidia surpasses $2T market cap on continued AI infrastructure demand",src:"Bloomberg",tag:"TECH"},
  {time:"07:30",sev:"high",  title:"Treasury warns of heightened cyber threats to financial infrastructure",src:"WSJ",tag:"RISK"},
];

export const FILINGS: Filing[] = [
  {ticker:"AAPL",co:"Apple Inc",        type:"10-Q",   time:"09:15",ai:"Revenue +8% YoY. Services segment slowing. China market -4%. Share buybacks continue at $90B pace."},
  {ticker:"JPM", co:"JPMorgan Chase",   type:"8-K",    time:"08:45",ai:"Q1 beat. NII guidance raised to $90B. Credit card delinquencies stable. IB pipeline strong."},
  {ticker:"XOM", co:"ExxonMobil",       type:"Form 4", time:"08:20",ai:"CEO purchased 50,000 shares at $112.40. Total insider buy: $5.62M. Bullish signal."},
  {ticker:"NVDA",co:"Nvidia Corp",      type:"S-1 Amend",time:"07:55",ai:"Updated offering. Data center demand remains strong. H100 allocation sold out through Q3."},
  {ticker:"TSLA",co:"Tesla Inc",        type:"10-Q",   time:"07:30",ai:"Margins compressed to 17.4%. Delivery miss vs consensus. Price cuts ongoing. Energy up +40%."},
  {ticker:"META",co:"Meta Platforms",   type:"8-K",    time:"07:10",ai:"AI infrastructure capex raised to $35-40B for 2024. Revenue per user up 12%. Threads growing."},
];

export const ALERTS_DATA: Alert[] = [
  {id:1,time:"09:44",type:"MARKET",sev:"high",  msg:"VIX spike detected: +12% in 15 minutes — potential volatility event forming"},
  {id:2,time:"09:38",type:"FILING",sev:"medium",msg:"New 8-K filed: Bank of America — material event disclosure pending review"},
  {id:3,time:"09:21",type:"MACRO", sev:"high",  msg:"CPI print: 3.4% vs 3.1% expected — ABOVE FORECAST, rate cut timeline at risk"},
  {id:4,time:"09:05",type:"MARKET",sev:"medium",msg:"Treasury 10Y yield crossed 4.5% threshold — watch equity valuations"},
  {id:5,time:"08:52",type:"NEWS",  sev:"low",   msg:"3 articles clustering around regional bank stress — monitoring situation"},
  {id:6,time:"08:34",type:"SIGNAL",sev:"high",  msg:"Unusual options flow: SPY puts $2.8M notional, exp 30D — bearish hedge"},
  {id:7,time:"08:18",type:"MACRO", sev:"medium",msg:"BOJ intervention risk elevated — JPY at 150.20, watch 150.50 level"},
];

export const SECTORS: Sector[] = [
  {name:"Technology",   p:+2.14,w:28},{name:"Financials",  p:+0.88,w:14},
  {name:"Healthcare",   p:-0.42,w:13},{name:"Cons. Disc.", p:+1.21,w:11},
  {name:"Industrials",  p:+0.65,w:9}, {name:"Energy",      p:+1.84,w:8},
  {name:"Comm. Svcs",   p:+1.43,w:8}, {name:"Materials",   p:-0.31,w:4},
  {name:"Utilities",    p:-0.88,w:3}, {name:"Real Estate", p:-1.24,w:3},
  {name:"Cons. Staples",p:+0.22,w:7},
];

export const BANKS: Bank[] = [
  {ticker:"JPM",name:"JPMorgan",       price:"$198.42",chg:"+1.24%",pos:true, cds:48, tier1:"15.0%",npl:"0.42%"},
  {ticker:"GS", name:"Goldman Sachs",  price:"$421.30",chg:"+0.84%",pos:true, cds:62, tier1:"14.5%",npl:"0.38%"},
  {ticker:"BAC",name:"Bank of America",price:"$38.21", chg:"+0.42%",pos:true, cds:71, tier1:"13.8%",npl:"0.51%"},
  {ticker:"MS", name:"Morgan Stanley", price:"$94.82", chg:"-0.21%",pos:false,cds:55, tier1:"15.2%",npl:"0.29%"},
  {ticker:"C",  name:"Citigroup",      price:"$62.44", chg:"-0.58%",pos:false,cds:84, tier1:"13.5%",npl:"0.62%"},
  {ticker:"WFC",name:"Wells Fargo",    price:"$56.78", chg:"+0.31%",pos:true, cds:68, tier1:"12.9%",npl:"0.58%"},
];

export const FED_DATA: CentralBankRate[] = [
  {label:"Fed Funds Rate", val:"5.25-5.50%", status:"HOLD",   ok:true},
  {label:"ECB Main Rate",  val:"4.50%",       status:"HOLD",   ok:true},
  {label:"BOJ Rate",       val:"0.10%",       status:"WATCH",  ok:false},
  {label:"BOE Rate",       val:"5.25%",       status:"HOLD",   ok:true},
  {label:"PBOC Rate",      val:"3.45%",       status:"EASING", ok:true},
  {label:"RBA Rate",       val:"4.35%",       status:"HOLD",   ok:true},
  {label:"Fed Balance Sheet",val:"$7.42T",   status:"QT",     ok:true},
  {label:"Next FOMC",      val:"May 1, 2025", status:"26D",    ok:true},
];

export const ECON: EconIndicator[] = [
  {label:"US CPI YoY",      val:"3.4%",  prev:"3.1%", up:true,  beat:false},
  {label:"US PCE YoY",      val:"2.8%",  prev:"2.7%", up:true,  beat:false},
  {label:"US GDP QoQ",      val:"1.6%",  prev:"3.4%", up:false, beat:false},
  {label:"Unemployment",    val:"3.9%",  prev:"3.7%", up:true,  beat:false},
  {label:"Retail Sales MoM",val:"+0.4%", prev:"-0.8%",up:true,  beat:true},
  {label:"ISM Mfg PMI",     val:"50.3",  prev:"47.8", up:true,  beat:true},
  {label:"ISM Svcs PMI",    val:"53.4",  prev:"52.6", up:true,  beat:true},
  {label:"Building Permits",val:"1.46M", prev:"1.42M",up:true,  beat:true},
];

export const IPO_MA: IpoMaItem[] = [
  {type:"M&A", name:"Synopsys / ANSYS",      size:"$35.0B",sector:"Tech",   status:"PENDING",sc:"#f59e0b"},
  {type:"IPO", name:"Reddit Inc.",            size:"$6.4B", sector:"Social", status:"PRICED", sc:"#22c55e"},
  {type:"M&A", name:"Capital One / Discover", size:"$35.3B",sector:"Finance",status:"REVIEW", sc:"#f97316"},
  {type:"IPO", name:"Shein Group",            size:"$50B+", sector:"Retail", status:"FILED",  sc:"#3b82f6"},
  {type:"SPAC",name:"GreenTech Holdings",     size:"$800M", sector:"Energy", status:"ACTIVE", sc:"#888888"},
  {type:"M&A", name:"Tapestry / Capri",       size:"$8.5B", sector:"Luxury", status:"BLOCKED",sc:"#ef4444"},
  {type:"IPO", name:"Cerebras Systems",       size:"$4.0B", sector:"AI",     status:"S-1",    sc:"#3b82f6"},
];

// New data sets
export const OPTIONS_FLOW: OptionsFlow[] = [
  {ticker:"SPY", type:"PUTS",  strike:"$510", exp:"30D", notional:"$2.8M", vol:"+340%",unusual:true,  side:"SWEEP"},
  {ticker:"NVDA",type:"CALLS", strike:"$950", exp:"7D",  notional:"$1.2M", vol:"+180%",unusual:true,  side:"BLOCK"},
  {ticker:"QQQ", type:"PUTS",  strike:"$425", exp:"14D", notional:"$4.1M", vol:"+520%",unusual:true,  side:"SWEEP"},
  {ticker:"TSLA",type:"CALLS", strike:"$200", exp:"45D", notional:"$0.8M", vol:"+95%", unusual:false, side:"RETAIL"},
  {ticker:"GLD", type:"CALLS", strike:"$195", exp:"60D", notional:"$3.2M", vol:"+280%",unusual:true,  side:"BLOCK"},
  {ticker:"TLT", type:"PUTS",  strike:"$95",  exp:"21D", notional:"$1.9M", vol:"+210%",unusual:true,  side:"SWEEP"},
];

export const MACRO_CALENDAR: MacroEvent[] = [
  {time:"08:30",name:"US CPI m/m",        impact:"HIGH",  prev:"0.4%",  est:"0.3%",  actual:"0.4%", surprise:"above"},
  {time:"10:00",name:"U. of Mich Sentiment",impact:"MED", prev:"77.9",  est:"79.0",  actual:null,   surprise:null},
  {time:"14:00",name:"Fed Chair Speech",  impact:"HIGH",  prev:null,    est:null,    actual:null,   surprise:null},
  {time:"14:30",name:"Crude Oil Inventories",impact:"MED",prev:"-1.4M", est:"-1.0M", actual:null,   surprise:null},
  {time:"Tomorrow",name:"ECB Rate Decision",impact:"HIGH",prev:"4.50%", est:"4.50%", actual:null,   surprise:null},
  {time:"Tomorrow",name:"US Retail Sales", impact:"HIGH", prev:"-0.8%", est:"+0.4%", actual:null,   surprise:null},
];

export const VOLATILITY: VolatilityItem[] = [
  {label:"VIX (30D)",   val:"18.42",chg:"-2.31%",pos:false,note:"Complacent"},
  {label:"VIX9D",       val:"16.80",chg:"-3.12%",pos:false,note:"Near-term calm"},
  {label:"VIX3M",       val:"19.80",chg:"-1.44%",pos:false,note:"Slight backw."},
  {label:"VVIX",        val:"84.20",chg:"+1.22%",pos:true, note:"Vol of vol rising"},
  {label:"MOVE Index",  val:"103.4",chg:"-4.20%",pos:false,note:"Rates vol easing"},
  {label:"SKEW Index",  val:"142.8",chg:"+2.10%",pos:true, note:"Tail risk bid"},
  {label:"Put/Call Ratio",val:"0.82",chg:"+0.12",pos:true, note:"Slightly bearish"},
  {label:"Fear & Greed",val:"72",   chg:"+4",    pos:true, note:"Greed territory"},
];

export const INSIDER: InsiderTrade[] = [
  {ticker:"XOM", name:"D. Woods CEO",      type:"BUY",  shares:"50,000",val:"$5.62M",  date:"03/20",signal:"STRONG"},
  {ticker:"MSFT",name:"S. Nadella CEO",    type:"SELL", shares:"31,000",val:"$12.1M",  date:"03/19",signal:"PLANNED"},
  {ticker:"BAC", name:"B. Moynihan CEO",   type:"BUY",  shares:"120,000",val:"$4.58M", date:"03/18",signal:"STRONG"},
  {ticker:"WMT", name:"C. McMillon CEO",   type:"SELL", shares:"42,000",val:"$8.20M",  date:"03/17",signal:"PLANNED"},
  {ticker:"AMZN",name:"A. Jassy CEO",      type:"BUY",  shares:"15,000",val:"$2.84M",  date:"03/15",signal:"NOTABLE"},
  {ticker:"GS",  name:"D. Solomon CEO",    type:"BUY",  shares:"8,000", val:"$3.37M",  date:"03/14",signal:"NOTABLE"},
];

export const EARNINGS_RADAR: EarningsItem[] = [
  {ticker:"GS",  name:"Goldman Sachs",  date:"Mon",  eps_est:"$8.54", eps_prev:"$5.48",rev_est:"$12.9B",implied_move:"+/-4.2%",rating:"BUY"},
  {ticker:"MS",  name:"Morgan Stanley", date:"Tue",  eps_est:"$2.02", eps_prev:"$1.70",rev_est:"$14.8B",implied_move:"+/-3.8%",rating:"BUY"},
  {ticker:"JNJ", name:"Johnson & Johnson",date:"Wed",eps_est:"$2.64",eps_prev:"$2.68",rev_est:"$21.4B",implied_move:"+/-2.1%",rating:"HOLD"},
  {ticker:"NFLX",name:"Netflix",         date:"Thu", eps_est:"$4.52", eps_prev:"$2.88",rev_est:"$9.7B", implied_move:"+/-7.4%",rating:"BUY"},
  {ticker:"TSLA",name:"Tesla",           date:"Tue", eps_est:"$0.49", eps_prev:"$0.85",rev_est:"$22.1B",implied_move:"+/-8.9%",rating:"HOLD"},
  {ticker:"META",name:"Meta Platforms",  date:"Wed", eps_est:"$4.71", eps_prev:"$2.20",rev_est:"$36.2B",implied_move:"+/-6.1%",rating:"BUY"},
];

export const DARKPOOL: DarkPoolTrade[] = [
  {ticker:"AAPL",side:"BUY", shares:"2.4M",price:"$172.40",notional:"$413.8M",exchange:"FINRA",time:"09:31",unusual:true},
  {ticker:"SPY", side:"SELL",shares:"8.1M",price:"$518.20",notional:"$4.20B", exchange:"IEX",  time:"09:28",unusual:true},
  {ticker:"MSFT",side:"BUY", shares:"1.1M",price:"$412.80",notional:"$454.1M",exchange:"FINRA",time:"09:22",unusual:false},
  {ticker:"NVDA",side:"BUY", shares:"0.9M",price:"$832.40",notional:"$749.2M",exchange:"BATS", time:"09:18",unusual:true},
  {ticker:"QQQ", side:"SELL",shares:"3.2M",price:"$440.20",notional:"$1.41B", exchange:"FINRA",time:"09:14",unusual:true},
  {ticker:"GLD", side:"BUY", shares:"4.4M",price:"$192.60",notional:"$847.4M",exchange:"IEX",  time:"09:08",unusual:true},
];

export const GEOPOLITICAL: GeopoliticalEvent[] = [
  {region:"Middle East",  event:"Iran-Israel tensions escalating after airspace incidents",     impact:"HIGH",  assets:"OIL,GOLD,USD",  change:"+2.4%"},
  {region:"Taiwan Strait",event:"PLAN naval exercises near Taiwan scheduled for next week",      impact:"HIGH",  assets:"TSM,SEMI,USD",  change:"-1.8%"},
  {region:"Russia-Ukraine",event:"EU extends sanctions package, energy discussions ongoing",    impact:"MED",   assets:"EUR,WHEAT,GAS", change:"+0.6%"},
  {region:"South China Sea",event:"US carrier group deployment extended through end of Q2",     impact:"MED",   assets:"OIL,DXY",       change:"+0.4%"},
  {region:"Saudi Arabia",  event:"OPEC+ production cut extension confirmed through June 2024",  impact:"HIGH",  assets:"OIL,SAR,XOM",   change:"+3.1%"},
  {region:"North Korea",   event:"Ballistic missile test, UN Security Council session called",  impact:"LOW",   assets:"JPY,GOLD,KRW",  change:"+0.8%"},
];

