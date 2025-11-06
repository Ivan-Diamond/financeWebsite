'use client'

import { useEffect, useState, useRef } from 'react'
import { WidgetProps } from '../../types'
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useWebSocket } from '@/lib/socket/client'
import { useMarketStore } from '@/stores/marketStore'

export default function LiveChart({ id, config, onConfigChange }: WidgetProps) {
  // Use selector for proper reactivity
  const activeSymbol = useDashboardStore(state => state.activeSymbol)
  const { subscribe, unsubscribe, isConnected } = useWebSocket()
  const marketStore = useMarketStore()
  
  // Use widget-specific symbol if configured, otherwise use global activeSymbol
  const symbol = config.symbol || activeSymbol
  const interval = config.interval || '5m'
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Get live data from market store
  const liveQuote = marketStore.quotes.get(symbol)
  const candleData = marketStore.candles.get(symbol) || []

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart with v4 API
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: '#1f2937' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      crosshair: {
        mode: 1,
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    // Add candlestick series (v4 API)
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    seriesRef.current = candlestickSeries as any

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [symbol, activeSymbol, interval])
  
  // Subscribe to symbol via centralized WebSocket
  useEffect(() => {
    if (symbol && isConnected) {
      console.log(`📈 LiveChart subscribing to ${symbol}`)
      subscribe([symbol])
      
      return () => {
        console.log(`📈 LiveChart unsubscribing from ${symbol}`)
        unsubscribe([symbol])
      }
    }
  }, [symbol, isConnected, subscribe, unsubscribe])
  
  // Update chart when candle data changes
  useEffect(() => {
    if (seriesRef.current && candleData.length > 0) {
      const chartData = candleData.map(candle => ({
        time: Math.floor(candle.time / 1000) as any,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
      
      seriesRef.current.setData(chartData)
    }
  }, [candleData])

  const changeInterval = (newInterval: string) => {
    onConfigChange({ ...config, interval: newInterval as any })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="text-sm font-semibold text-white">{symbol}</div>
          {isConnected && <span className="ml-2 text-green-400 text-xs">● LIVE</span>}
          {liveQuote && (
            <div className="flex items-center space-x-1">
              <div className="text-sm font-mono text-gray-200">${liveQuote.price.toFixed(2)}</div>
              <div className={`text-xs font-mono ${liveQuote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {liveQuote.change >= 0 ? '+' : ''}{liveQuote.changePercent.toFixed(2)}%
              </div>
            </div>
          )}
          <div className="text-xs text-gray-400">{interval}</div>
        </div>
        <div className="flex gap-1">
          {['1m', '5m', '15m', '1h', '4h', '1d'].map((int) => (
            <button
              key={int}
              onClick={() => changeInterval(int)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                interval === int
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {int}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  )
}
