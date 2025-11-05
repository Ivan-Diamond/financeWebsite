'use client'

import { useEffect, useState } from 'react'
import { WidgetProps } from '../../types'
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboardStore'

export default function PriceTicker({ id, config }: WidgetProps) {
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Use selector for proper reactivity
  const activeSymbol = useDashboardStore(state => state.activeSymbol)

  // Use widget-specific symbol if configured, otherwise use global activeSymbol
  const symbol = config.symbol || activeSymbol

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/market/quote/${symbol}`)
        const data = await response.json()
        
        if (data.success) {
          setQuote(data.data)
        } else {
          setError(data.error || 'Failed to fetch quote')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }

    fetchQuote()
    // Update every 2 seconds for real-time feel
    const interval = setInterval(fetchQuote, config.refreshInterval || 2000)
    return () => clearInterval(interval)
  }, [symbol, activeSymbol, config.refreshInterval])

  if (loading && !quote) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm px-4 text-center">
        {error}
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
