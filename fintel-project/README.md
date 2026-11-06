# FINTEL COMMAND v5

A live financial-intelligence terminal: global markets, rates, macro, positioning, filings and news on one screen.
React 18 · TypeScript 5 (strict) · Vite 5 · MapLibre GL. Every number on screen comes from a real source;
when a source is down the panel says so instead of showing placeholder data.

## Run it

```bash
cd fintel-project
npm install
cp .env.example .env      # optional: add SEC_USER_AGENT (your name + email) so EDGAR filings load
npm run dev               # http://localhost:5173
```

No API keys are required. Two optional free keys unlock extra panels; paste them in **Settings** (the status
button, top right) or put them in `.env`:

| Key | Unlocks | Get one |
|---|---|---|
| Finnhub | Earnings calendar with EPS beats/misses, IPO calendar | finnhub.io/register |
| Groq | AI morning brief written only from the numbers on screen | console.groq.com/keys |

## Panels and where the data comes from

| Panel | Source | Refresh |
|---|---|---|
| Ticker tape, indices, sectors, volatility, commodities, FX, heatmap, watchlist, S&P history | Yahoo Finance chart API (delayed) | 60 s |
| Global map: index & currency per country, chokepoints | Yahoo Finance + World Bank indicators | 60 s / daily |
| Treasury curve, Fed & central banks, liquidity, credit & conditions | FRED (St. Louis Fed) | 30 min |
| US economy (CPI, PCE, jobs, GDP, retail, housing, sentiment, M2) | FRED | 1 h |
| Fed funds futures-implied rate | Yahoo (ZQ=F) | 60 s |
| Treasury auctions (results & upcoming) | fiscaldata.treasury.gov | 1 h |
| Speculative positioning (COT) | CFTC public reporting API | 6 h |
| Crypto (prices, dominance, Fear & Greed, BTC fees) | CoinGecko, alternative.me, mempool.space | 2 min |
| SEC filings (8-K, Form 4, S-1, 13D) | SEC EDGAR live feed | 5 min |
| Headlines + headline tone | CNBC, MarketWatch, Federal Reserve, SEC RSS | 5 min |
| Earnings & IPOs | Finnhub (key) | 1 h |
| Morning brief | Groq, Llama 3.3 70B (key) | on demand |

Sources without browser (CORS) access go through the Vite dev/preview server relay (`/px/*` in
`vite.config.ts`), so run it with `npm run dev` or `npm run build && npm run preview`. A static host on its
own (e.g. GitHub Pages) can't serve the relayed panels.

## Scripts

```bash
npm run dev        # dev server with hot reload and the data relay
npm run build      # strict typecheck + production build
npm run preview    # serve the build, with the relay
npm test           # unit tests for parsers, calculations and the data store
npm run typecheck
```

## Layout

```
src/
  main.tsx, App.tsx          shell: header, clocks, ticker, grid, settings
  data/
    store.ts                 shared source store: dedupe, refresh, stale-on-error, status
    yahoo.ts                 quotes (one batched source all panels share) and charts
    fred.ts                  FRED CSV, YoY / diff helpers
    sources.ts               Treasury, CFTC, crypto, World Bank, EDGAR, RSS, Finnhub, Groq
    universe.ts              instrument lists, FOMC dates, map countries & chokepoints
    parsers.test.ts          unit tests
  panels/                    markets.tsx, macro.tsx, flows.tsx, brief.tsx
  map/WorldMap.tsx
  ui/                        kit.tsx (Panel, Spark, Chg, Tabs), charts.tsx, theme.ts, styles.css
```

For research, not trading advice. Yahoo Finance data is delayed and for personal use.
