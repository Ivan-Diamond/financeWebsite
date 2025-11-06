# 🚀 WebSocket Upgrade Plan - Massive.com (Polygon.io) Integration

**Date:** November 6, 2025  
**Current Status:** Partial WebSocket implementation for stocks only  
**Target:** Real-time options + stocks with Massive.com official client  

---

## 📊 Current Implementation Analysis

### What We Have Now

#### ✅ Stock WebSocket (Working)
- **Endpoint:** `wss://socket.polygon.io/stocks`
- **Implementation:** Native WebSocket API
- **Features:**
  - Real-time stock price updates
  - Aggregate data (per second OHLCV)
  - Auto-reconnection logic
  - Client subscription management
  - Broadcast to multiple dashboard widgets

#### ❌ Options WebSocket (Missing)
- **Status:** Not implemented
- **Impact:** Options Analytics widget uses **30-second polling** instead of real-time
- **Current method:** REST API calls every 30 seconds
- **User experience:** Delayed data, not true real-time

#### 🔧 Current Architecture
```
Browser Client (React)
    ↓
Next.js WebSocket Proxy (/api/socket)
    ↓
Server-side WebSocket Manager
    ↓
Polygon.io WebSocket (wss://socket.polygon.io/stocks)
    ↓
Broadcast to subscribed clients
```

### Current Code Locations
- **Client:** `/src/lib/socket/client.ts`
- **Server:** `/src/lib/socket/server.ts`
- **API Route:** `/src/app/api/socket/route.ts`
- **Types:** `/src/lib/socket/types.ts`

---

## 🆕 Massive.com Updates (Polygon.io Rebrand)

### New WebSocket Endpoints

#### Stocks (Real-Time)
```
OLD: wss://socket.polygon.io/stocks
NEW: wss://socket.massive.com/stocks
```

#### Options (Real-Time) ⭐ NEW!
```
NEW: wss://socket.massive.com/options
```

### Official Client Library

**Package:** `@massive.com/client-js`

**Benefits:**
- ✅ Automatic authentication handling
- ✅ Built-in reconnection logic
- ✅ Type safety for messages
- ✅ Simplified subscription management
- ✅ Better error handling
- ✅ Official support and updates

**Example Usage (from docs):**
```javascript
import { websocketClient } from "@massive.com/client-js";

// Create WebSocket client
const ws = websocketClient('YOUR_API_KEY', 'wss://socket.massive.com').options();

// Handle messages
ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  console.log('Options data:', data);
}

// Subscribe to option contract
ws.send(JSON.stringify({
  "action": "subscribe", 
  "params": "A.O:SPY251219C00650000"
}));
```

---

## 🎯 Improvement Plan

### Phase 1: Update URLs (Low Risk) ⚡ **Priority: HIGH**

**Goal:** Migrate from polygon.io to massive.com domains

**Changes Required:**
1. Update WebSocket URL in `/src/lib/socket/server.ts`
   ```typescript
   // OLD
   const wsUrl = `wss://socket.polygon.io/stocks`
   
   // NEW
   const wsUrl = `wss://socket.massive.com/stocks`
   ```

2. Update all API client URLs in `/src/lib/api/polygon.ts`
   ```typescript
   // OLD
   private baseUrl = 'https://api.polygon.io'
   
   // NEW
   private baseUrl = 'https://api.massive.com'
   ```

3. Update environment variable documentation
   - Rename references from "Polygon API Key" to "Massive API Key"
   - Update .env.example

**Estimated Time:** 30 minutes  
**Risk:** Low (backward compatible, same API)  
**Impact:** Future-proofing against deprecation  

---

### Phase 2: Add Options WebSocket Streaming 🔥 **Priority: CRITICAL**

**Goal:** Real-time options data for Options Analytics widget

#### 2A. Dual WebSocket Connections

**Architecture:**
```
Server-side Manager
    ├─ Stock WebSocket (wss://socket.massive.com/stocks)
    │   └─ Handles: Stock quotes, aggregates
    └─ Options WebSocket (wss://socket.massive.com/options)
        └─ Handles: Option contract updates, Greeks, IV
```

**Implementation Steps:**

1. **Update WebSocketManager class** (`/src/lib/socket/server.ts`)
   ```typescript
   class WebSocketManager {
     private stockWs: WebSocket | null = null      // Stocks
     private optionsWs: WebSocket | null = null    // Options ⭐ NEW
     
     // Separate subscription maps
     private stockSubscriptions: Map<string, Set<string>> = new Map()
     private optionsSubscriptions: Map<string, Set<string>> = new Map() // ⭐ NEW
     
     constructor() {
       this.connectToStocks()
       this.connectToOptions()  // ⭐ NEW
     }
     
     private connectToOptions() {
       const wsUrl = `wss://socket.massive.com/options`
       this.optionsWs = new WebSocket(wsUrl)
       
       this.optionsWs.on('message', (data) => {
         // Handle options data
         // Format: A.O:SPY251219C00650000
         this.handleOptionsMessage(data)
       })
     }
   }
   ```

2. **Add Options Message Handler**
   ```typescript
   private handleOptionsMessage(msg: any) {
     // Options aggregate format:
     // {
     //   "ev": "A",
     //   "sym": "O:SPY251219C00650000",
     //   "v": 100,       // volume
     //   "o": 5.20,      // open
     //   "c": 5.25,      // close (current price)
     //   "h": 5.30,      // high
     //   "l": 5.15,      // low
     //   "vw": 5.22,     // volume weighted price
     //   "s": 1699300800000  // timestamp
     // }
     
     if (msg.ev === 'A' && msg.sym.startsWith('O:')) {
       this.broadcastOptionUpdate({
         contractId: msg.sym,
         price: msg.c,
         volume: msg.v,
         timestamp: msg.s,
         open: msg.o,
         high: msg.h,
         low: msg.l,
       })
     }
   }
   ```

3. **Subscribe to Option Contracts**
   ```typescript
   subscribeToOptions(contractIds: string[]) {
     if (!this.optionsWs || this.optionsWs.readyState !== WebSocket.OPEN) {
       return
     }
     
     // Format: A.O:SPY251219C00650000
     const params = contractIds.map(id => `A.${id}`).join(',')
     
     this.optionsWs.send(JSON.stringify({
       action: 'subscribe',
       params
     }))
   }
   ```

4. **Update Client Hook** (`/src/lib/socket/client.ts`)
   ```typescript
   // Add new method
   subscribeToOptions(contractIds: string[]) {
     const message: ClientMessage = {
       type: 'subscribe_options',  // ⭐ NEW type
       contractIds,
       timestamp: Date.now(),
     }
     this.send(message)
   }
   ```

#### 2B. Update Options Analytics Widget

**File:** `/src/components/dashboard/widgets/OptionsAnalytics/OptionsAnalytics.tsx`

1. **Add WebSocket Hook**
   ```typescript
   import { useWebSocket } from '@/lib/socket/client'
   
   export default function OptionsAnalytics({ id, config, onConfigChange }: WidgetProps) {
     const { subscribeToOptions, unsubscribeFromOptions } = useWebSocket()
     
     // When contracts are loaded, subscribe to real-time updates
     useEffect(() => {
       if (optionsData) {
         const contractIds = [
           ...filteredCalls.map(c => c.contractId),
           ...filteredPuts.map(c => c.contractId)
         ]
         
         subscribeToOptions(contractIds)
         
         return () => unsubscribeFromOptions(contractIds)
       }
     }, [optionsData, filteredCalls, filteredPuts])
   }
   ```

2. **Listen to Real-Time Updates**
   ```typescript
   const { quotes: optionQuotes } = useMarketData(contractIds)
   
   // Update mini-graph data when new prices arrive
   useEffect(() => {
     optionQuotes.forEach(({ contractId, data }) => {
       if (data) {
         updateMiniGraphData(contractId, data.price, data.timestamp)
       }
     })
   }, [optionQuotes])
   ```

**Result:**
- ✅ Real-time option price updates (sub-second)
- ✅ Live mini-graphs updating continuously
- ✅ No more 30-second polling delays
- ✅ True real-time dashboard experience

**Estimated Time:** 4-6 hours  
**Risk:** Medium (new WebSocket connection)  
**Impact:** HIGH - dramatically improves user experience  

---

### Phase 3: Migrate to Official Client Library 📦 **Priority: MEDIUM**

**Goal:** Use `@massive.com/client-js` instead of native WebSocket

**Benefits:**
- Less boilerplate code
- Better error handling
- Official TypeScript types
- Automatic updates from Massive.com

**Changes:**

1. **Install Package**
   ```bash
   npm install @massive.com/client-js
   ```

2. **Update Server Implementation**
   ```typescript
   import { websocketClient } from "@massive.com/client-js";
   
   class WebSocketManager {
     private stockWs: any
     private optionsWs: any
     
     constructor() {
       const apiKey = process.env.POLYGON_API_KEY
       
       // Create stock client
       this.stockWs = websocketClient(apiKey, 'wss://socket.massive.com').stocks()
       
       // Create options client
       this.optionsWs = websocketClient(apiKey, 'wss://socket.massive.com').options()
       
       this.setupHandlers()
     }
     
     private setupHandlers() {
       // Stock messages
       this.stockWs.onmessage = (msg) => {
         const data = JSON.parse(msg.data)
         this.handleStockMessage(data)
       }
       
       // Options messages
       this.optionsWs.onmessage = (msg) => {
         const data = JSON.parse(msg.data)
         this.handleOptionsMessage(data)
       }
       
       // Error handling
       this.stockWs.onerror = (err) => console.error('Stock WS error:', err)
       this.optionsWs.onerror = (err) => console.error('Options WS error:', err)
     }
   }
   ```

**Estimated Time:** 2-3 hours  
**Risk:** Medium (dependency on third-party package)  
**Impact:** Code simplification, better maintainability  

---

### Phase 4: Enhanced Features 🌟 **Priority: LOW**

**Optional Improvements:**

1. **Options Greeks Real-Time**
   - Stream live Delta, Gamma, Theta, Vega updates
   - Update Greeks Matrix widget in real-time

2. **Volume Profile Updates**
   - Show real-time volume changes
   - Highlight unusual option activity

3. **Multi-Strike Streaming**
   - Subscribe to entire option chain
   - Show all strikes updating simultaneously

4. **Performance Optimizations**
   - Throttle updates (max 1 per second per contract)
   - Batch broadcasts to clients
   - Implement message queuing

**Estimated Time:** 4-8 hours  
**Risk:** Low  
**Impact:** Enhanced user experience  

---

## 🗺️ Recommended Implementation Order

### Week 1: Foundation
- [ ] **Day 1-2:** Phase 1 - Update URLs to massive.com
- [ ] **Day 3-5:** Phase 2A - Implement options WebSocket connection

### Week 2: Integration
- [ ] **Day 1-3:** Phase 2B - Integrate with Options Analytics widget
- [ ] **Day 4-5:** Testing and bug fixes

### Week 3: Enhancement (Optional)
- [ ] **Day 1-3:** Phase 3 - Migrate to official client library
- [ ] **Day 4-5:** Phase 4 - Enhanced features

---

## 📋 Task Breakdown

### Immediate (This Week)

#### Task 1: Update WebSocket URLs ⚡
**Priority:** HIGH  
**Time:** 30 min  

**Files to modify:**
- `/src/lib/socket/server.ts` (line 43)
- `/src/lib/api/polygon.ts` (baseUrl)

**Changes:**
```diff
- const wsUrl = `wss://socket.polygon.io/stocks`
+ const wsUrl = `wss://socket.massive.com/stocks`

- private baseUrl = 'https://api.polygon.io'
+ private baseUrl = 'https://api.massive.com'
```

#### Task 2: Add Options WebSocket 🔥
**Priority:** CRITICAL  
**Time:** 6 hours  

**Subtasks:**
1. Add `optionsWs` connection in WebSocketManager
2. Implement `connectToOptions()` method
3. Add `handleOptionsMessage()` handler
4. Create `subscribeToOptions()` method
5. Update client types for options subscriptions
6. Test with SPY option contracts

#### Task 3: Update Options Analytics Widget
**Priority:** HIGH  
**Time:** 3 hours  

**Subtasks:**
1. Add `useWebSocket` hook
2. Subscribe to contracts on load
3. Listen for real-time updates
4. Update mini-graph data on price changes
5. Remove 30-second polling interval
6. Add connection status indicator

---

## 🎯 Success Metrics

### Before (Current State)
- ❌ Options data: 30-second delay
- ❌ Mini-graphs: Static until refresh
- ❌ User experience: Stale data

### After (Target State)
- ✅ Options data: Real-time (sub-second)
- ✅ Mini-graphs: Live updates
- ✅ User experience: Professional, real-time dashboard
- ✅ Reduced API calls: WebSocket vs polling
- ✅ Lower latency: ~100ms vs 30,000ms

---

## ⚠️ Considerations

### Free Tier Limitations
**Massive.com Free Tier:**
- ✅ Delayed data (15 minutes)
- ❌ May not support real-time options WebSocket
- ❌ Connection limits

**Recommendation:**
- Test with delayed WebSocket first
- Upgrade to Starter tier ($99/mo) for real-time options
- Document tier requirements in README

### API Key Security
- ✅ API key stored in server-side .env
- ✅ Never exposed to browser
- ✅ WebSocket proxy architecture

### Error Handling
- Implement exponential backoff for reconnections
- Show user-friendly error messages
- Fallback to polling if WebSocket fails
- Log all connection issues for debugging

### Performance
- Limit subscriptions (max 50 contracts simultaneously)
- Throttle updates (1 per second per contract)
- Implement message batching
- Monitor memory usage

---

## 🚀 Quick Start: Immediate Action

**To implement options WebSocket TODAY:**

1. **Update URLs** (5 minutes)
   ```bash
   # Find and replace
   sed -i 's/socket.polygon.io/socket.massive.com/g' src/lib/socket/server.ts
   sed -i 's/api.polygon.io/api.massive.com/g' src/lib/api/polygon.ts
   ```

2. **Add Options Connection** (30 minutes)
   - Open `/src/lib/socket/server.ts`
   - Duplicate `connectToPolygon()` → `connectToOptions()`
   - Change URL to `wss://socket.massive.com/options`
   - Add to constructor

3. **Test Connection** (10 minutes)
   ```bash
   npm run dev
   # Check server logs for "Connected to Options WebSocket"
   ```

4. **Subscribe to Test Contract** (15 minutes)
   ```typescript
   // In server.ts
   this.optionsWs.send(JSON.stringify({
     action: 'subscribe',
     params: 'A.O:SPY251219C00650000'
   }))
   ```

5. **Log Messages** (5 minutes)
   ```typescript
   this.optionsWs.on('message', (data) => {
     console.log('Options message:', JSON.parse(data.toString()))
   })
   ```

---

## 📝 Summary

### Current State
- ✅ Stock WebSocket working
- ❌ No options WebSocket
- ⚠️ Using old polygon.io URLs

### Proposed State
- ✅ Stock WebSocket (massive.com)
- ✅ Options WebSocket (massive.com) ⭐ NEW
- ✅ Real-time Options Analytics widget
- ✅ Official client library (optional)

### Impact
- **User Experience:** Real-time options data
- **Performance:** WebSocket vs polling (100x faster)
- **Scalability:** Better connection management
- **Future-proof:** Official library support

---

**Ready to implement?** Start with Phase 1 (URL updates) and Phase 2A (options WebSocket). This will give you real-time options data in the Options Analytics widget within a day of development work! 🚀
