import React, { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts'

interface LiveChartSectionProps {
  symbol: string
  data: Array<{ time: number; open: number; high: number; low: number; close: number }>
}

export default function LiveChartSection({ symbol, data }: LiveChartSectionProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [chartHeight, setChartHeight] = useState(300)

  // Measure container height
  useEffect(() => {
    if (!chartContainerRef.current) return
    
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setChartHeight(entry.contentRect.height)
      }
    })
    
    observer.observe(chartContainerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!chartContainerRef.current || chartHeight === 0) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1f2937' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    // Add candlestick series
    const series = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    seriesRef.current = series

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
      }
    }
  }, [chartHeight])

  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return

    const formattedData = data.map(d => ({
      time: Math.floor(d.time / 1000) as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    seriesRef.current.setData(formattedData)
  }, [data])

  return (
    <div className="h-full flex flex-col bg-gray-800/30 rounded border border-gray-700">
      <div className="text-xs font-semibold text-gray-200 p-2 border-b border-gray-700">
        📈 {symbol} Chart
      </div>
      
      {!data || data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-2">📈</div>
            <div className="text-xs">Loading...</div>
          </div>
        </div>
      ) : (
        <div ref={chartContainerRef} className="flex-1 overflow-hidden" />
      )}
    </div>
  )
}
