// ── FINTEL COMMAND — Master Type Definitions ─────────────────────────────────
// Every data shape used across the dashboard is defined here.
// Import from '@/types' in all components.

// ── Theme ─────────────────────────────────────────────────────────────────────
export interface Theme {
  bg: string;
  surface: string;
  panel: string;
  panelHover: string;
  border: string;
  borderHi: string;
  white: string;
  grey100: string;
  grey200: string;
  grey400: string;
  grey500: string;
  grey600: string;
  grey700: string;
  grey800: string;
  green: string;
  greenDim: string;
  red: string;
  redDim: string;
  amber: string;
  blue: string;
  mono: string;
  sans: string;
}

// ── Market Data ───────────────────────────────────────────────────────────────
export interface MarketIndex {
  name: string;
  val: string;
  chg: string;
  pos: boolean;
  seed: number;
  mktCap: string;
  pe: string;
}

export interface Commodity {
  name: string;
  val: string;
  chg: string;
  pos: boolean;
  unit: string;
  seed: number;
  wk: string;
  yr: string;
}

export interface ForexPair {
  pair: string;
  val: string;
  chg: string;
  pos: boolean;
  seed: number;
}

export interface CryptoAsset {
  sym: string;
  name: string;
  val: string;
  chg: string;
  pos: boolean;
  seed: number;
  dom: string;
  mcap: string;
}

export interface YieldPoint {
  t: string;
  v: number;
}

// ── News & Alerts ─────────────────────────────────────────────────────────────
export type Severity = 'high' | 'medium' | 'low';
export type AlertType = 'MARKET' | 'FILING' | 'MACRO' | 'NEWS' | 'SIGNAL';

export interface NewsItem {
  time: string;
  sev: Severity;
  title: string;
  src: string;
  tag: string;
}

export interface Alert {
  id: number;
  time: string;
  type: AlertType;
  sev: Severity;
  msg: string;
}

export interface Filing {
  ticker: string;
  co: string;
  type: string;
  time: string;
  ai: string;
}

// ── Sectors & Banks ───────────────────────────────────────────────────────────
export interface Sector {
  name: string;
  p: number;
  w: number;
}

export interface Bank {
  ticker: string;
  name: string;
  price: string;
  chg: string;
  pos: boolean;
  cds: number;
  tier1: string;
  npl: string;
}

export interface CentralBankRate {
  label: string;
  val: string;
  status: string;
  ok: boolean;
}

export interface EconIndicator {
  label: string;
  val: string;
  prev: string;
  up: boolean;
  beat: boolean;
}

// ── Options & Dark Pool ───────────────────────────────────────────────────────
export interface OptionsFlow {
  ticker: string;
  type: 'CALLS' | 'PUTS';
  strike: string;
  exp: string;
  notional: string;
  vol: string;
  unusual: boolean;
  side: string;
}

export interface MacroEvent {
  time: string;
  name: string;
  impact: 'HIGH' | 'MED' | 'LOW';
  prev: string | null;
  est: string | null;
  actual: string | null;
  surprise: 'above' | 'below' | null;
}

export interface VolatilityItem {
  label: string;
  val: string;
  chg: string;
  pos: boolean;
  note: string;
}

export interface InsiderTrade {
  ticker: string;
  name: string;
  type: 'BUY' | 'SELL';
  shares: string;
  val: string;
  date: string;
  signal: 'STRONG' | 'PLANNED' | 'NOTABLE';
}

export interface EarningsItem {
  ticker: string;
  name: string;
  date: string;
  eps_est: string;
  eps_prev: string;
  rev_est: string;
  implied_move: string;
  rating: 'BUY' | 'HOLD' | 'SELL';
}

export interface DarkPoolTrade {
  ticker: string;
  side: 'BUY' | 'SELL';
  shares: string;
  price: string;
  notional: string;
  exchange: string;
  time: string;
  unusual: boolean;
}

export interface GeopoliticalEvent {
  region: string;
  event: string;
  impact: 'HIGH' | 'MED' | 'LOW';
  assets: string;
  change: string;
}

export interface IpoMaItem {
  type: 'IPO' | 'M&A' | 'SPAC';
  name: string;
  size: string;
  sector: string;
  status: string;
  sc: string;
}

// ── S&P 500 Heatmap ───────────────────────────────────────────────────────────
export interface HeatmapStock {
  t: string;
  p: number;
  mc: number;
}

export interface HeatmapSector {
  sector: string;
  stocks: HeatmapStock[];
}

export interface HeatmapRect extends HeatmapStock {
  x: number;
  y: number;
  w: number;
  h: number;
  sector: string;
  sectorX: number;
  sectorY: number;
  sectorW: number;
  sectorH: number;
}

export interface SectorRect {
  sector: string;
  mc: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── Historical Performance ────────────────────────────────────────────────────
export interface HistoricalYear {
  y: number;
  r: number;
}

export interface CumulativePoint {
  y: number;
  v: number;
}

// ── ETF ───────────────────────────────────────────────────────────────────────
export type ETFCategory =
  | 'US Equity'
  | 'Intl Equity'
  | 'Fixed Income'
  | 'Sector'
  | 'Commodity'
  | 'Thematic';

export interface ETF {
  sym: string;
  name: string;
  cat: ETFCategory;
  aum: string;
  exp: string;
  price: string;
  chg: string;
  pos: boolean;
  seed: number;
  ytd: string;
  div: string;
}

// ── Bond Credit Ratings ───────────────────────────────────────────────────────
export interface SovereignBond {
  country: string;
  rating: string;
  outlook: 'Stable' | 'Positive' | 'Negative';
  yield10y: string;
  cds: number;
  change: string;
  moody: string;
  fitch: string;
  sp: string;
  color: string;
}

export interface CorporateBond {
  issuer: string;
  ticker: string;
  rating: string;
  sector: string;
  yield: string;
  spread: string;
  cds: number;
  maturity: string;
  color: string;
}

export interface BondRatings {
  government: SovereignBond[];
  corporate: CorporateBond[];
}

// ── Fed Futures ───────────────────────────────────────────────────────────────
export interface RateOutcome {
  rate: string;
  label: string;
  p: number;
  color: string;
}

export interface FedMeeting {
  meeting: string;
  date: string;
  probs: RateOutcome[];
  implied: string;
  prevDay: string;
  change: string;
}

// ── Short Interest ────────────────────────────────────────────────────────────
export interface ShortStock {
  ticker: string;
  name: string;
  shortFloat: number;
  borrowRate: number;
  dtc: number;
  si: number;
  siChange: number;
  price: string;
  squeeze: number;
  sector: string;
}

// ── Market Breadth ────────────────────────────────────────────────────────────
export interface SectorBreadth {
  name: string;
  pct: number;
  count: number;
}

export interface AdvanceDecline {
  advancing: number;
  declining: number;
  unchanged: number;
  adLine: number[];
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface SP500Breadth {
  above200dma: number;
  above50dma: number;
  above20dma: number;
  new52wHigh: number;
  new52wLow: number;
  rsi50plus: number;
}

export interface McClellan {
  oscillator: number;
  summation: number;
  signal: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
}

export interface BreadthData {
  advanceDecline: AdvanceDecline;
  sp500: SP500Breadth;
  mcclellan: McClellan;
  trin: number;
  putCallRatio: number;
  equityPutCall: number;
  upVolume: number;
  downVolume: number;
  highLowIndex: number;
  sectorBreadth: SectorBreadth[];
}

// ── Map / World ───────────────────────────────────────────────────────────────
export interface CountryIntel {
  code: string;
  gdp: string;
  gdpGrowth: string;
  inflation: string;
  rate: string;
  index: string;
  indexVal: string;
  indexChg: string;
  debt: string;
  rating: string;
  pos: boolean;
  signals: string[];
  risk: number;
}

export interface FinancialNode {
  id: string;
  name: string;
  lon: number;
  lat: number;
  perf: number;
  type: 'exchange' | 'central' | 'commodity';
}

export interface Cable {
  color: string;
  pts: [number, number][];
}

export interface Pipeline {
  color: string;
  pts: [number, number][];
}

// ── Watchlist ─────────────────────────────────────────────────────────────────
export interface WatchlistStock {
  ticker: string;
  name: string;
  price: string;
  chg: string;
  pos: boolean;
  seed: number;
  pe: string;
  vol: string;
  wk52: string;
}

// ── Component Props ───────────────────────────────────────────────────────────
export interface PanelProps {
  title: string;
  sub?: string;
  right?: unknown;
  children: unknown;
  style?: Record<string, unknown>;
}

export interface BadgeProps {
  label: string;
  color?: string;
}

export interface SevBadgeProps {
  sev: Severity;
}

export interface LiveDotProps {
  color?: string;
  size?: number;
}

export interface SparklineProps {
  seed: number;
  positive: boolean;
  width?: number;
  height?: number;
  showArea?: boolean;
}

export interface RowProps {
  children: unknown;
  hover?: boolean;
}

export interface SectionHeaderProps {
  label: string;
}
