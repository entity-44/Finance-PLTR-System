# FINTEL COMMAND: project context for Claude

The app lives in `fintel-project/`. See its README for running it and the source table.

## Rules
- **No invented data.** Every number must come from a real source. If a source fails, the panel shows its
  error/stale state. Don't add static "fallback" numbers, seeded random sparklines or sample tables.
  (v4 had these; v5 removed them.)
- Keys never go in the repo. Optional keys: Settings (localStorage) or `.env` (git-ignored). `SEC_USER_AGENT`
  is server-side only (vite.config.ts).
- Keep `npm run build` (strict TS, noUnusedLocals) and `npm test` green. The GitHub "CI" workflow runs both.

## Architecture
- `src/data/store.ts`: every data source is a `SourceDef { id, label, provider, every, requires?, fetch }`.
  `useSource(def)` shares one fetch per id across panels, refreshes on `every`, pauses while the tab is
  hidden, keeps the last data as `stale` on failure, and re-runs if a refresh was requested mid-flight.
  Parameterised defs go through `sourceFor(id, make)` so the id maps to one object.
- Quotes: `useQuotes(symbols)` registers symbols with one shared Yahoo spark source (`yahoo:quotes`,
  20 symbols per request). Don't create per-panel quote fetches.
- Panels use `<Panel title src span note right>`; it renders loading/error/needs-key states and the
  provider + "updated" footer. Grid spans: c3/c4/c6/c8/c12 on a 12-column grid; each row should sum to 12.
- CORS-blocked hosts go through the Vite relay `/px/<name>` (yahoo, fred, sec, fed, cnbc, mw, groq).
  Direct from the browser: fiscaldata.treasury.gov, publicreporting.cftc.gov, CoinGecko, alternative.me,
  mempool.space, World Bank, Finnhub, CARTO basemap.

## Verified endpoints (Nov 2026)
- Yahoo: `/v7/finance/spark?symbols=A,B&range=1d&interval=5m` (no key). Result order ≠ request order.
- FRED: `/graph/fredgraph.csv?id=X&cosd=YYYY-MM-DD`; blank value = no observation (skip it).
  Dead/stale IDs: IRSTCB01* (stopped 2023). Live: DFEDTARU/L, EFFR, SOFR, ECBDFR, IUDSOIA, DGS*, T10Y2Y,
  T10Y3M, T10YIE, DFII10, BAMLH0A0HYM2, BAMLC0A0CM, NFCI, STLFSI4, WALCL, WTREGEN, RRPONTSYD, DTWEXBGS, plus
  macro CPIAUCSL, CPILFESL, PCEPILFE, UNRATE, PAYEMS, ICSA, A191RL1Q225SBEA, RSAFS, INDPRO, HOUST, UMCSENT, M2SL.
- Treasury auctions: results lag ~3 weeks in `auctions_query`; filter `bid_to_cover_ratio:gt:0` for results.
- CFTC: TFF dataset `gpe5-46if` (lev_money_*), disaggregated `72hh-3qpy` (m_money_*_all).
  Consolidated codes: S&P 500 `13874+`, Nasdaq-100 `20974+`.

## Ideas not built yet
- Aesthetic pass (Luis is sending a reference).
- Hosting: needs a tiny server/edge relay for the `/px` routes (Vite only relays in dev/preview).
- Earnings-season beat rate across a full season (needs a longer Finnhub window).
