# FINTEL COMMAND v4.0 — TypeScript

Financial intelligence terminal. 28 panels. React 18 + TypeScript 5 + Vite 5.

## Quick Start (3 steps)

**Step 1 — Install**
```bash
npm install
```

**Step 2 — Add your Protomaps key**
Open `src/WorldMap.tsx` and replace:
```ts
const PROTOMAPS_API_KEY = 'YOUR_KEY_HERE';
// replace with:
const PROTOMAPS_API_KEY = 'bf6e47d323bd141e';
```

**Step 3 — Run**
```bash
npm run dev
```
Open http://localhost:5173

## Scripts
```bash
npm run dev        # dev server with hot reload
npm run build      # production build
npm run typecheck  # TypeScript check only
npm run preview    # preview production build
```

## File Structure
```
src/
  types.ts         All TypeScript interfaces (40+ types)
  theme.tsx        Theme object + base components (Panel, Badge, LiveDot...)
  data.ts          All typed data constants
  WorldMap.tsx     MapLibre GL + Protomaps map
  panels1.tsx      Core panels: Markets, News, Alerts, SEC, Commodities,
                   Forex, Crypto, FixedIncome, CentralBanks, Banking,
                   Sector, IPO/MA, Econ, OptionsFlow, MacroCalendar,
                   Volatility, Insider, EarningsRadar, DarkPool,
                   Geopolitical
  panels2.tsx      SP500 Heatmap, Historical Performance, Watchlist,
                   ETF Monitor, Bond Credit Ratings
  panels3.tsx      Fed Funds Futures, Short Interest, Market Breadth
  App.tsx          Navigation, ticker tape, full grid layout
  main.tsx         React entry point
```

## TypeScript Features Added
- 40+ typed interfaces in `types.ts` for every data shape
- `React.memo()` on all leaf components (Badge, LiveDot, Sparkline, Row, SectionHeader)
- Explicit generic `useState<T>()` throughout
- `as const` on theme object
- Code splitting via Vite `manualChunks`
