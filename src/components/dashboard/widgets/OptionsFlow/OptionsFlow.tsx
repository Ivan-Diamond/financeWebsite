'use client'

import { useEffect, useState } from 'react'
import { WidgetProps } from '../../types'
import { useDashboardStore } from '@/stores/dashboardStore'

interface OptionsFlowData {
  symbol: string
  strike: number
  expiry: string
  type: 'call' | 'put'
  volume: number
  openInterest: number
  lastPrice: number
  bid: number
  ask: number
  impliedVolatility?: number
  delta?: number
  timestamp: number
  isUnusual: boolean
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

interface FlowMeta {
  symbol: string
  expiry: string
  totalFlows: number
  unusualCount: number
  avgVolume: number
  volumeThreshold: number
}

export default function OptionsFlow({ id, config }: WidgetProps) {
  const [flows, setFlows] = useState<OptionsFlowData[]>([])
  const [meta, setMeta] = useState<FlowMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'calls' | 'puts' | 'unusual'>('all')
  const [sortBy, setSortBy] = useState<'volume' | 'price' | 'oi'>('volume')
  
  const activeSymbol = useDashboardStore(state => state.activeSymbol)
  const symbol = config.symbol || activeSymbol

  useEffect(() => {
    fetchFlows()
    const interval = setInterval(fetchFlows, 30000)
    return () => clearInterval(interval)
  }, [symbol, activeSymbol])

  const fetchFlows = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/options/flow?symbol=${symbol}&limit=50`)
      const data = await response.json()
      
      if (data.flows) {
        setFlows(data.flows)
        setMeta(data.meta)
      }
    } catch (error) {
      console.error('Failed to fetch options flow:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredFlows = flows.filter(flow => {
    if (filter === 'calls') return flow.type === 'call'
    if (filter === 'puts') return flow.type === 'put'
    if (filter === 'unusual') return flow.isUnusual
    return true
  })

  const sortedFlows = [...filteredFlows].sort((a, b) => {
    if (sortBy === 'volume') return b.volume - a.volume
    if (sortBy === 'price') return b.lastPrice - a.lastPrice
    if (sortBy === 'oi') return b.openInterest - a.openInterest
    return 0
  })

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'bullish') return 'text-green-400'
    if (sentiment === 'bearish') return 'text-red-400'
    return 'text-gray-400'
  }

  const getSentimentBg = (sentiment: string) => {
    if (sentiment === 'bullish') return 'bg-green-500/10'
    if (sentiment === 'bearish') return 'bg-red-500/10'
    return 'bg-gray-500/10'
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-white">Options Flow: {symbol}</div>
          {meta && <div className="text-xs text-gray-400">{meta.unusualCount} unusual / {meta.totalFlows} total</div>}
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1">
            {['all', 'calls', 'puts', 'unusual'].map((f) => (
              <button key={f} onClick={() => setFilter(f as any)} className={`px-2 py-1 text-xs rounded capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{f}</button>
            ))}
          </div>
          <div className="flex gap-1 ml-auto">
            {['volume', 'price', 'oi'].map((s) => (
              <button key={s} onClick={() => setSortBy(s as any)} className={`px-2 py-1 text-xs rounded uppercase ${sortBy === s ? 'bg-gray-600' : 'bg-gray-800'}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-b-2 border-blue-500 rounded-full"></div></div>
        ) : sortedFlows.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">No options flow data</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {sortedFlows.map((flow, idx) => (
              <div key={idx} className={`px-4 py-2 hover:bg-gray-800 ${flow.isUnusual ? 'border-l-2 border-yellow-500' : ''} ${getSentimentBg(flow.sentiment)}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${flow.type === 'call' ? 'bg-green-600' : 'bg-red-600'} text-white`}>{flow.type.toUpperCase()}</span>
                    <span className="text-sm font-semibold text-white">${flow.strike}</span>
                    {flow.isUnusual && <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Unusual</span>}
                  </div>
                  <div className={`text-xs font-medium ${getSentimentColor(flow.sentiment)}`}>{flow.sentiment.toUpperCase()}</div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div><div className="text-gray-500">Volume</div><div className="text-white font-medium">{flow.volume.toLocaleString()}</div></div>
                  <div><div className="text-gray-500">OI</div><div className="text-white font-medium">{flow.openInterest.toLocaleString()}</div></div>
                  <div><div className="text-gray-500">Price</div><div className="text-white font-medium">${flow.lastPrice.toFixed(2)}</div></div>
                  <div><div className="text-gray-500">IV</div><div className="text-white font-medium">{flow.impliedVolatility ? `${(flow.impliedVolatility * 100).toFixed(1)}%` : 'N/A'}</div></div>
                </div>
                {meta && (
                  <div className="mt-2"><div className="h-1 bg-gray-700 rounded-full overflow-hidden"><div className={`h-full ${flow.isUnusual ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{width: `${Math.min((flow.volume / meta.volumeThreshold) * 100, 100)}%`}}></div></div></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {meta && !loading && (
        <div className="px-4 py-2 border-t border-gray-700 bg-gray-800">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><div className="text-gray-500">Avg Volume</div><div className="text-white font-medium">{meta.avgVolume.toLocaleString()}</div></div>
            <div><div className="text-gray-500">Threshold</div><div className="text-white font-medium">{meta.volumeThreshold.toLocaleString()}</div></div>
            <div><div className="text-gray-500">Expiry</div><div className="text-white font-medium">{new Date(meta.expiry).toLocaleDateString()}</div></div>
          </div>
        </div>
      )}
    </div>
  )
}
