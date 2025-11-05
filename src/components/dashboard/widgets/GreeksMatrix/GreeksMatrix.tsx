'use client'

import { useEffect, useState } from 'react'
import { WidgetProps } from '../../types'
import { useDashboardStore } from '@/stores/dashboardStore'

export default function GreeksMatrix({ id, config, onConfigChange }: WidgetProps) {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [chain, setChain] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalCallDelta: 0, totalPutDelta: 0, putCallRatio: 0 })
  
  // Use selector for proper reactivity  
  const activeSymbol = useDashboardStore(state => state.activeSymbol)
  
  // Use widget-specific symbol if configured, otherwise use global activeSymbol
  const symbol = config.symbol || activeSymbol
  const greek = config.greek || 'delta'

  useEffect(() => {
    fetchData()
    // Refresh every 30 seconds (slower, less disruptive)
    const interval = setInterval(() => fetchData(true), 30000)
    return () => clearInterval(interval)
  }, [symbol, activeSymbol])

  const fetchData = async (isUpdate = false) => {
    try {
      if (isUpdate) {
        setUpdating(true)  // Show small indicator, don't block UI
      } else {
        setLoading(true)   // First load, show full loading
      }
      const response = await fetch(`/api/options/snapshot/${symbol}`)
      const data = await response.json()
      
      if (data.success) {
        setSummary({
          totalCallDelta: data.data.totalCallVolume,
          totalPutDelta: data.data.totalPutVolume,
          putCallRatio: data.data.putCallRatio,
        })
      }
    } catch (error) {
      console.error('Failed to fetch Greeks data:', error)
    } finally {
      setLoading(false)
      setUpdating(false)
    }
  }

  const getGreekColor = (value: number) => {
    if (greek === 'delta') {
      return value > 0.5 ? 'bg-green-500' : value > 0 ? 'bg-green-700' : 'bg-red-700'
    }
    return 'bg-blue-500'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="text-sm font-semibold text-white mb-2">
          Greeks Matrix: {symbol}
        </div>
        <div className="flex gap-1">
          {(['delta', 'gamma', 'theta', 'vega'] as const).map((g) => (
            <button
              key={g}
              onClick={() => onConfigChange({ ...config, greek: g })}
              className={`px-2 py-1 text-xs rounded capitalize transition-colors ${
                greek === g
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto relative">
        {/* Small updating indicator */}
        {updating && (
          <div className="absolute top-2 right-2 z-10">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        
        {loading && !summary.totalCallDelta ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-400">Call Volume</div>
                <div className="text-lg font-semibold text-green-400">
                  {summary.totalCallDelta.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-400">Put Volume</div>
                <div className="text-lg font-semibold text-red-400">
                  {summary.totalPutDelta.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-400">P/C Ratio</div>
                <div className="text-lg font-semibold text-blue-400">
                  {summary.putCallRatio.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Greek Explanation */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-lg font-semibold text-white mb-2">
                {greek === 'delta' ? 'Delta (Δ)' : greek === 'gamma' ? 'Gamma (Γ)' : greek === 'theta' ? 'Theta (Θ)' : 'Vega (ν)'}
              </div>
              <div className="text-sm text-gray-300">
                {greek === 'delta' && 'Rate of change in option price per $1 move in stock. Calls: 0 to 1, Puts: -1 to 0'}
                {greek === 'gamma' && 'Rate of change in Delta. Higher Gamma = faster Delta changes'}
                {greek === 'theta' && 'Time decay per day. How much value the option loses each day'}
                {greek === 'vega' && 'Sensitivity to volatility changes. How much price changes per 1% IV move'}
              </div>
              <div className="mt-3 text-xs text-gray-400">
                💡 Tip: Options near the money (ATM) have the highest {greek}
              </div>
              <div className="mt-3 text-xs text-blue-400">
                ⏱️ Auto-updates every 30 seconds
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
