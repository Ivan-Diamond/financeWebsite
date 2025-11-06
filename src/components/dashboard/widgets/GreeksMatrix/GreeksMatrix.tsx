'use client'

import { useEffect, useState } from 'react'
import { WidgetProps } from '../../types'
import { useDashboardStore } from '@/stores/dashboardStore'

export default function GreeksMatrix({ id, config, onConfigChange }: WidgetProps) {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [optionsData, setOptionsData] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalCallDelta: 0, totalPutDelta: 0, putCallRatio: 0, stockPrice: 0 })
  
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
        setUpdating(true)
      } else {
        setLoading(true)
      }
      
      // Fetch actual options chain with Greeks
      const chainResponse = await fetch(`/api/options/chain/${symbol}?strikeRange=5`)
      const chainData = await chainResponse.json()
      
      if (chainData.success && chainData.data.chain) {
        const options = chainData.data.chain
        setOptionsData(options)
        
        // Calculate summary
        const callVolume = options.filter((o: any) => o.type === 'call').reduce((sum: number, o: any) => sum + (o.volume || 0), 0)
        const putVolume = options.filter((o: any) => o.type === 'put').reduce((sum: number, o: any) => sum + (o.volume || 0), 0)
        
        setSummary({
          totalCallDelta: callVolume,
          totalPutDelta: putVolume,
          putCallRatio: callVolume > 0 ? putVolume / callVolume : 0,
          stockPrice: chainData.data.stockPrice || 0,
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

            {/* Greek Values Table */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
                <span>{greek === 'delta' ? 'Delta (Δ)' : greek === 'gamma' ? 'Gamma (Γ)' : greek === 'theta' ? 'Theta (Θ)' : 'Vega (ν)'} by Strike</span>
                <span className="text-xs text-gray-400">ATM: ${summary.stockPrice.toFixed(0)}</span>
              </div>
              
              {optionsData.length > 0 ? (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {optionsData
                    .filter((opt: any) => opt.type === 'call')
                    .slice(0, 10)
                    .map((opt: any) => {
                      const greekValue = opt[greek] || 0
                      const isATM = Math.abs(opt.strike - summary.stockPrice) < 5
                      const barWidth = greek === 'delta' ? Math.abs(greekValue) * 100 : Math.min(Math.abs(greekValue) * 1000, 100)
                      
                      return (
                        <div key={opt.strike} className={`flex items-center text-xs ${isATM ? 'bg-blue-900/30' : ''} rounded px-2 py-1`}>
                          <div className="w-16 text-gray-400">${opt.strike}</div>
                          <div className="flex-1 mx-2">
                            <div className="h-4 bg-gray-600 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${greekValue > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                          <div className={`w-16 text-right font-mono ${greekValue > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {greekValue.toFixed(3)}
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-4">
                  Loading Greeks data...
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400">
                {greek === 'delta' && '📊 Delta shows sensitivity to $1 price move'}
                {greek === 'gamma' && '📊 Gamma shows how fast Delta changes'}
                {greek === 'theta' && '📊 Theta shows daily time decay (negative)'}
                {greek === 'vega' && '📊 Vega shows IV sensitivity'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
