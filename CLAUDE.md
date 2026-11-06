# Parallax (formerly FINTEL COMMAND): project context for Claude

The repo is ldiazbusquets/parallax (site: ldiazbusquets.github.io/parallax/); the product name is Parallax. Internal ids (`fintel.*` storage
keys, `fintel:*` events, the `fintel-project/` folder) keep the old name on purpose: renaming storage keys
would wipe visitors' saved layouts, watchlists, alerts and keys.

The app lives in `fintel-project/`. See its README for running it and the source table.

## Rules
- **No invented data.** Every number must come from a real source. If a source fails, the panel shows its
  error/stale state. Don't add static "fallback" numbers, seeded random sparklines or sample tables.
  (v4 had these; v5 removed them.)
- Keys never go in the repo. Optional keys: Settings (localStorage) or `.env` (git-ignored). `SEC_USER_AGENT`
  is server-side only (vite.config.ts).
- Keep `npm run build` (strict TS, noUnusedLocals) and `npm test` green. The GitHub "CI" workflow runs both.

## Modes (src/lib/env.ts)
- Local dev/preview: CORS-blocked hosts via the Vite relay `/px/<name>`.
- Website (`VITE_STATIC=1`): those hosts come from `public/snap/*.json` (`{ generated, data }`) written by
  `scripts/snapshot.ts`, run by `.github/workflows/deploy.yml` every ~15 min. Source defs set `asOf` so
  "updated" shows the snapshot time. Anything a browser can call directly stays live.
- Node (snapshot script, run with vite-node): hosts fetched directly; `getText` adds a User-Agent
  (`SEC_USER_AGENT` secret for sec.gov).
- Relay prefixes are prefix-matched in order: never add one that starts with an existing one (`/px/sec*`).

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

- BIS policy rates: `stats.bis.org/api/v1/data/WS_CBPOL/D./all?startPeriod=…&detail=dataonly` with
  `Accept: application/vnd.sdmx.data+csv;version=1.0.0`. No CORS (relay `/px/bis`, snapshot `bis.json`). Euro area = XM.
- IMF WEO: `imf.org/external/datamapper/api/v1/<INDICATOR>` (all countries, all years; `periods` is ignored).
  No CORS (relay `/px/imf`, snapshot `imf.json`). Aggregates: WEOWORLD, ADVEC, OEMDC, EURO. Includes Taiwan.
- OECD 10Y government yields on FRED: `IRLTLT01<CC>M156N` (monthly). Live for 29 OECD countries; none for
  BR, CN, IN, ID, TR, CO (404) and RU (stopped 2018).
- Yahoo indices that don't exist: ^IPSA (Chile), ^COLCAP (use ICOLCAP.CL ETF), ^SPBLPGPT (Peru), ^PX (Prague = 0),
  ^KSE100, ^MASI, ^NGSE, ^QSI, ^DFMGI. Countries without one show currency only.
- Company data (`src/data/company.ts`): CIK from company_tickers.json; submissions + XBRL companyfacts from
  data.sec.gov (companyfacts has no CORS, so the site precomputes); Form 4 raw XML = primaryDocument with the
  `xslF345X05/` prefix removed. TTM = last FY + current YTD − prior-year YTD. Unit-tested.
- Layout (`src/ui/layout.tsx`): panel registry lives in App.tsx (`PANELS`), presets in layout.tsx; each preset
  row should sum to 12.

## Look (v6, from Luis's Vexto reference)
- Charcoal `#0c0c0c` page, 22px rounded gradient cards with no header rules, sentence-case titles with a faint ↗.
- Outfit for UI text, Inter Tight (light, tabular) for numbers; `<Big>` dims the decimals of display numbers.
- Pills for tabs/buttons; dashed grids; LineChart marks the window high (white) and low (warm dot).
- One warm accent `#ef6f3c`, used sparingly (lows, focus, active command). Luis dislikes yellow/amber: don't drift toward it.
- Map: Esri World Imagery (desaturated) by default with a Streets (CARTO) toggle; overlays are glass (`--glass`).

## Ideas not built yet
- Earnings-season beat rate across a full season (needs a longer Finnhub window).
- Institutional holders (13F) and activist stakes (13D/G) as extra edges in the link view.
