# LiveChart Widget - Lightweight-Charts v5 Compatibility Issue

## Problem
The LiveChart widget crashes with:
```
Uncaught Error: Assertion failed
at sn.addSeries
```

## Root Cause
**lightweight-charts v5.0.9** has breaking API changes from v4.x. The methods for adding chart series have changed significantly.

### What We Tried:

1. **Method 1:** `chart.addCandlestickSeries()` 
   - Error: `addCandlestickSeries is not a function`
   - This method doesn't exist in v5

2. **Method 2:** `chart.addSeries('Candlestick', options)`
   - Error: `Assertion failed`
   - The series type parameter is incorrect or the API has changed

## Temporary Solution
LiveChart widget now shows a placeholder message:
```
📈 Live Chart
Chart functionality temporarily disabled due to lightweight-charts v5 compatibility.
Will be fixed in next update.
```

## Permanent Solutions (Choose One)

### Option A: Downgrade to lightweight-charts v4
```bash
npm install lightweight-charts@^4.2.0
```

**Pros:**
- Known working API
- Our current code compatible
- Stable and well-documented

**Cons:**
- Older version
- Missing v5 features

### Option B: Fix v5 Compatibility
Research correct v5 API and update code:

1. Check official documentation: https://tradingview.github.io/lightweight-charts/
2. Look for migration guide from v4 to v5
3. Update imports and API calls
4. Test thoroughly

**Example of potential v5 API:**
```typescript
import { createChart, CandlestickSeries } from 'lightweight-charts'

const chart = createChart(container, options)
const candlestickSeries = chart.addSeries(CandlestickSeries, {
  // options
})
```

### Option C: Use Alternative Charting Library
Consider replacing lightweight-charts with:
- **Recharts** - React-specific, simpler API
- **Chart.js** - Popular, well-documented
- **Apache ECharts** - Feature-rich, professional
- **Plotly.js** - Advanced visualizations

## Current Status
- ✅ Dashboard loads without errors
- ✅ Other widgets work normally
- ⚠️ LiveChart shows placeholder
- ❌ No candlestick chart visualization

## Files Affected
- `/src/components/dashboard/widgets/LiveChart/LiveChart.tsx` - Main component
- `package.json` - Dependencies

## Next Steps
1. Research lightweight-charts v5 documentation
2. Decide on permanent solution (A, B, or C)
3. Implement and test
4. Remove placeholder and enable chart

## Notes
- This issue doesn't affect other widgets
- Symbol selector still works for LiveChart (changes symbol in header)
- Interval selector still works (changes interval in header)
- Chart rendering is the only broken part

---

**Date Created:** November 5, 2025
**Status:** TEMPORARILY DISABLED
**Priority:** MEDIUM (not blocking other features)
