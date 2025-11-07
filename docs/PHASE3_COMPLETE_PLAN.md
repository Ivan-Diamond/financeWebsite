# Phase 3: Complete Dashboard with Options Market Integration

## What's Already Built (Phases 1 & 2)

**Database:**
- ✅ Widget model supports 'options_table' type
- ✅ JSONB config for flexible options settings
- ✅ OptionsContract type with all Greeks (delta, gamma, theta, vega, rho)

**API:**
- ✅ polygonClient.getOptionsChain() already exists
- ✅ REST API pattern established
- ✅ Polling mechanism works

## Phase 3 Plan: 12-15 Hours

### Part A: Foundation (3h)
**A1. Grid Layout (2h)**
- Install: react-grid-layout, lightweight-charts, recharts
- Create: DashboardGrid, WidgetWrapper, WidgetToolbar
- Implement: Drag & drop, resize, responsive breakpoints

**A2. Widget Registry (1h)**
- Define all widget types (stocks + options)
- Set size constraints per widget
- Create lazy loading system

### Part B: Options API (2h)
**New Endpoints:**
- `/api/options/chain/[symbol]` - Full options chain
- `/api/options/snapshot/[symbol]` - Quick options summary
- `/api/options/expiries/[symbol]` - Available expiry dates
- `/api/options/flow` - Unusual options activity

### Part C: Stock Widgets (3h)
**C1. Price Ticker (1h)**
- Large price display with color coding
- Volume, high/low, open interest
- Quick action: "View Options" button
- Poll every 5 seconds

**C2. Live Chart (1.5h)**
- TradingView Lightweight Charts
- Candlestick + volume bars
- Toggle: Stock chart ⟷ Options IV chart
- Real-time updates

**C3. Watchlist (0.5h)**
- Multi-symbol table
- Sortable columns
- **Options column:** Show total options volume + unusual activity indicator
- Bulk API fetch for efficiency

### Part D: Options Widgets (4h)
**D1. Options Chain (2h)**
- Dual panel: Calls | Puts
- Show: Strike, Last, Delta, Bid, Ask
- Highlight ATM strike
- Toggle Greeks display
- Filter: Strike range, min volume/OI
- Refresh every 10 seconds

**D2. Greeks Matrix (1.5h)**
- Heatmap visualization
- Select Greek: Delta/Gamma/Theta/Vega
- Color gradient based on values
- Summary stats: Total Delta, Put/Call Ratio, Max Pain

**D3. Options Flow (0.5h)**
- Real-time large trade feed
- Show: Time, Symbol, Strike, Premium, Volume
- Signal indicators: 🔥 Big trade, 🟢 Buy, 🔴 Sell
- Filter by symbol/timeframe

### Part E: Config & Toolbar (2h)
**E1. Widget Config Modal (1h)**
- Dynamic forms per widget type
- Symbol picker with search
- Options-specific settings (expiry, strike range, Greeks)
- Delete widget button

**E2. Widget Toolbar (1h)**
- "Add Widget" dropdown menu
- Categories: Stock Widgets, Options Widgets
- Drag from menu to add
- Save Layout button (Phase 4)

### Part F: Integration (2h)
**F1. Update Dashboard Page (1h)**
- Replace placeholder with DashboardGrid
- Wire up Zustand stores
- Add header with navigation

**F2. Create Presets (1h)**
- Day Trader preset (watchlist + 1m charts + flow)
- Options Trader preset (chain + Greeks + flow)
- Swing Trader preset (4h charts + watchlist)
- Load preset selector in toolbar

## Widget Size Constraints

```
'price-ticker':   minW: 2, minH: 2, defaultW: 3, defaultH: 2
'live-chart':     minW: 4, minH: 3, defaultW: 6, defaultH: 4
'watchlist':      minW: 3, minH: 3, defaultW: 4, defaultH: 4
'options-chain':  minW: 6, minH: 4, defaultW: 8, defaultH: 6
'greeks-matrix':  minW: 4, minH: 3, defaultW: 6, defaultH: 4
'options-flow':   minW: 4, minH: 3, defaultW: 5, defaultH: 4
```

## Timeline

| Day | Tasks | Hours |
|-----|-------|-------|
| 1 | Grid Layout + Registry + Options API | 5h |
| 2 | Stock Widgets (all 3) | 3h |
| 3 | Options Chain + Greeks Matrix | 3.5h |
| 4 | Options Flow + Config + Toolbar + Integration | 3.5h |

**Total: 15 hours**

## Key Features After Phase 3

**Stock Features:**
- Real-time price tracking
- Live charts with volume
- Multi-symbol watchlists

**Options Features:**
- Full options chain with Greeks
- Visual Greeks heatmap
- Unusual options activity tracker
- IV tracking
- Max pain calculation
- Put/Call ratio analysis

**Dashboard Features:**
- Drag & drop widgets
- Responsive layout
- Widget configuration
- 3 preset layouts
- Auto-refresh (5-10 sec)

## Ready to Start?
Let's begin with Part A: Grid Layout Setup!
