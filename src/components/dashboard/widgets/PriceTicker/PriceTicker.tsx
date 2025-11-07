'use client'

import { useEffect, useState } from 'react'
import { WidgetProps } from '../../types'
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useMarketStore } from '@/stores/marketStore'
import { useMarketQuote } from '@/hooks/useMarketData'

export default function PriceTicker({ id, config }: WidgetProps) {
  const [initialLoad, setInitialLoad] = useState(true)
  
  // Use selector for proper reactivity
  const activeSymbol = useDashboardStore(state => state.activeSymbol)

  // Use widget-specific symbol if configured, otherwise use global activeSymbol
  const symbol = config.symbol || activeSymbol
  
  // Use WebSocketManager for real-time quotes (subscription only)
  const { isConnected } = useMarketQuote(symbol)
  
  // Get quote directly from store (avoids re-render loop)
  const quote = useMarketStore(state => state.quotes.get(symbol))
  
  // Handle initial loading state
  useEffect(() => {
    if (quote) {
      setInitialLoad(false)
    }
  }, [quote])

  if (initialLoad && !quote) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full text-yellow-400 text-sm px-4 text-center">
        Connecting to live feed...
      </div>
    )
  }

  if (!quote) return null

  return (
    <div className="flex flex-col h-full p-3">
      {/* Price Display - Compact */}
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <div className="text-2xl font-bold text-white leading-tight">
          {formatCurrency(quote.price)}
        </div>
        <div className={`text-sm font-semibold mt-1 ${getChangeColor(quote.change)}`}>
          {quote.change > 0 ? '+' : ''}{formatCurrency(quote.change)} ({formatPercent(quote.changePercent)})
        </div>
      </div>

      {/* Metrics - Compact */}
      <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-700 pt-2 mt-2">
        <div>
          <div className="text-gray-500 text-[10px]">Volume</div>
          <div className="text-white font-medium text-xs">
            {quote.volume ? (quote.volume / 1000000).toFixed(1) + 'M' : 'N/A'}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-[10px]">Range</div>
          <div className="text-white font-medium text-xs truncate">
            ${quote.low?.toFixed(0)}-${quote.high?.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Quick Actions - Compact */}
      <button
        className="w-full px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors mt-2"
        onClick={() => alert(`Options chain for ${symbol} - Coming soon!`)}
      >
        View Options
      </button>
    </div>
  )
}
