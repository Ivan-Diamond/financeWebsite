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
  
  // Debug logging
  useEffect(() => {
    console.log(`📈 LiveChartSection:`, { 
      symbol, 
      dataLength: data?.length, 
      chartHeight,
      hasContainer: !!chartContainerRef.current,
      hasChart: !!chartRef.current,
      hasSeries: !!seriesRef.current
    })
  }, [symbol, data, chartHeight])

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
    if (!chartContainerRef.current) {
      console.log('📈 Chart creation skipped: no container')
      return
    }
    
    if (chartHeight === 0) {
      console.log('📈 Chart creation skipped: height is 0')
      return
    }

    try {
      console.log(`📈 Creating chart with height: ${chartHeight}px`)
      
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
      
      console.log('📈 Chart created successfully')

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
    } catch (error) {
      console.error('📈 Chart creation error:', error)
    }
  }, [chartHeight])

  useEffect(() => {
    if (!seriesRef.current) {
      console.log('📈 Data update skipped: no series')
      return
    }
    
    if (!data || data.length === 0) {
      console.log('📈 Data update skipped: no data')
      return
    }

    try {
      console.log(`📈 Setting ${data.length} candles to chart`)
      
      const formattedData = data.map(d => ({
        time: Math.floor(d.time / 1000) as any,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))

      seriesRef.current.setData(formattedData)
      console.log('📈 Data set successfully')
    } catch (error) {
      console.error('📈 Data setting error:', error)
    }
  }, [data])

  return (
    <div className="h-full flex flex-col bg-gray-800/30 rounded border border-gray-700">
      <div className="text-xs font-semibold text-gray-200 p-2 border-b border-gray-700">
        📈 {symbol} Chart
      </div>
      
      <div className="flex-1 relative overflow-hidden">
        {/* Always render the chart container so ref can attach */}
        <div ref={chartContainerRef} className="absolute inset-0" />
        
        {/* Show loading overlay when no data */}
        {(!data || data.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 backdrop-blur-sm">
            <div className="text-center text-gray-500">
              <div className="text-2xl mb-2">📈</div>
              <div className="text-xs">Loading chart data...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
