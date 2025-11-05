'use client'

import { useEffect, useState, useRef } from 'react'
import { WidgetProps } from '../../types'
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts'
import { useDashboardStore } from '@/stores/dashboardStore'

export default function LiveChart({ id, config, onConfigChange }: WidgetProps) {
  // Use selector for proper reactivity
  const activeSymbol = useDashboardStore(state => state.activeSymbol)
  
  // Use widget-specific symbol if configured, otherwise use global activeSymbol
  const symbol = config.symbol || activeSymbol
  const interval = config.interval || '5m'
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
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

    // Use the correct API for lightweight-charts v5
    const candlestickSeries = chart.addSeries('Candlestick' as any, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    seriesRef.current = candlestickSeries as any

    // Fetch historical data
    fetchHistoricalData()

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

  const fetchHistoricalData = async () => {
    try {
      setLoading(true)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)

      const response = await fetch(
        `/api/market/historical/${symbol}?from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}&timespan=${interval === '1d' ? 'day' : interval.replace('m', '')}&multiplier=1`
      )
      const data = await response.json()

      if (data.success && data.data && seriesRef.current) {
        const candlestickData = data.data.map((bar: any) => ({
          time: bar.time / 1000,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        }))
        seriesRef.current.setData(candlestickData)
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error)
    } finally {
      setLoading(false)
    }
  }

  const changeInterval = (newInterval: string) => {
    onConfigChange({ ...config, interval: newInterval as any })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="text-sm font-semibold text-white">{symbol}</div>
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
