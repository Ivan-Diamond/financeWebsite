'use client'

import { useEffect, useState } from 'react'
import { WidgetProps } from '../../types'
import { useDashboardStore } from '@/stores/dashboardStore'

export default function GreeksMatrix({ id, config, onConfigChange }: WidgetProps) {
  const [loading, setLoading] = useState(true)
  const [chain, setChain] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalCallDelta: 0, totalPutDelta: 0, putCallRatio: 0 })
  
  // Use selector for proper reactivity  
  const activeSymbol = useDashboardStore(state => state.activeSymbol)
  
  // Use widget-specific symbol if configured, otherwise use global activeSymbol
  const symbol = config.symbol || activeSymbol
  const greek = config.greek || 'delta'

  useEffect(() => {
    fetchData()
  }, [symbol, activeSymbol])

  const fetchData = async () => {
    try {
      setLoading(true)
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
      <div className="flex-1 p-4 overflow-auto">
        {loading ? (
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

            {/* Heatmap Placeholder */}
            <div className="bg-gray-700 rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">
                {greek === 'delta' ? 'Δ' : greek === 'gamma' ? 'Γ' : greek === 'theta' ? 'Θ' : 'ν'}
              </div>
              <div className="text-sm text-gray-400">
                {greek.charAt(0).toUpperCase() + greek.slice(1)} Matrix Visualization
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Visual heatmap coming soon
              </div>
              <div className="mt-4 grid grid-cols-10 gap-1">
                {Array.from({ length: 50 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-8 rounded ${getGreekColor(Math.random())}`}
                    style={{ opacity: 0.3 + Math.random() * 0.7 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
