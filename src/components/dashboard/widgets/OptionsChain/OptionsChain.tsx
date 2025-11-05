'use client'

import { useEffect, useState } from 'react'
import { WidgetProps } from '../../types'
import { formatCurrency } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboardStore'

interface OptionData {
  strike: number
  call?: { bid: number; ask: number; last: number; volume: number; delta?: number }
  put?: { bid: number; ask: number; last: number; volume: number; delta?: number }
}

export default function OptionsChain({ id, config }: WidgetProps) {
  const [chain, setChain] = useState<OptionData[]>([])
  const [stockPrice, setStockPrice] = useState(0)
  const [atmStrike, setAtmStrike] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expiries, setExpiries] = useState<string[]>([])
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null)
  
  // Use selector for proper reactivity
  const activeSymbol = useDashboardStore(state => state.activeSymbol)
  
  // Use widget-specific symbol if configured, otherwise use global activeSymbol
  const symbol = config.symbol || activeSymbol

  useEffect(() => {
    fetchExpiries()
  }, [symbol, activeSymbol])

  useEffect(() => {
    if (selectedExpiry) {
      fetchChain()
      // Auto-refresh every 15 seconds (less aggressive, smoother experience)
      const interval = setInterval(fetchChain, 15000)
      return () => clearInterval(interval)
    }
  }, [symbol, activeSymbol, selectedExpiry])

  const fetchExpiries = async () => {
    try {
      const response = await fetch(`/api/options/expiries/${symbol}`)
      const data = await response.json()
      if (data.success && data.data.length > 0) {
        setExpiries(data.data.slice(0, 5)) // First 5 expiries
        setSelectedExpiry(data.data[0])
      }
    } catch (error) {
      console.error('Failed to fetch expiries:', error)
    }
  }

  const fetchChain = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/options/chain/${symbol}?expiry=${selectedExpiry}&strikeRange=10`
      )
      const data = await response.json()
      
      if (data.success) {
        setStockPrice(data.data.stockPrice)
        setAtmStrike(data.data.atmStrike)
        
        // Group by strike
        const strikeMap = new Map<number, OptionData>()
        data.data.chain.forEach((opt: any) => {
          if (!strikeMap.has(opt.strike)) {
            strikeMap.set(opt.strike, { strike: opt.strike })
          }
          const entry = strikeMap.get(opt.strike)!
          if (opt.type === 'call') {
            entry.call = {
              bid: opt.bid,
              ask: opt.ask,
              last: opt.last,
              volume: opt.volume,
              delta: opt.delta,
            }
          } else {
            entry.put = {
              bid: opt.bid,
              ask: opt.ask,
              last: opt.last,
              volume: opt.volume,
              delta: opt.delta,
            }
          }
        })
        
        setChain(Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike))
      }
    } catch (error) {
      console.error('Failed to fetch chain:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold text-white">
              Options Chain: {symbol}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Spot: {formatCurrency(stockPrice)} • ATM: {formatCurrency(atmStrike)}
            </div>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {expiries.map((exp) => (
            <button
              key={exp}
              onClick={() => setSelectedExpiry(exp)}
              className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                selectedExpiry === exp
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {new Date(exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
      </div>

      {/* Chain Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-750 sticky top-0">
              <tr className="text-gray-400">
                <th className="px-2 py-2 text-right font-medium">Bid</th>
                <th className="px-2 py-2 text-right font-medium">Ask</th>
                <th className="px-2 py-2 text-right font-medium">Vol</th>
                <th className="px-2 py-2 text-center font-medium bg-gray-700">Strike</th>
                <th className="px-2 py-2 text-right font-medium">Vol</th>
                <th className="px-2 py-2 text-right font-medium">Bid</th>
                <th className="px-2 py-2 text-right font-medium">Ask</th>
              </tr>
              <tr className="text-gray-500 text-[10px]">
                <th colSpan={3} className="px-2 py-1 text-center bg-green-900/20">CALLS</th>
                <th className="px-2 py-1 bg-gray-700"></th>
                <th colSpan={3} className="px-2 py-1 text-center bg-red-900/20">PUTS</th>
              </tr>
            </thead>
            <tbody>
              {chain.map((row) => {
                const isATM = Math.abs(row.strike - atmStrike) < 2.5
                const callITM = row.strike < stockPrice
                const putITM = row.strike > stockPrice
                
                return (
                  <tr
                    key={row.strike}
                    className={`border-b border-gray-700 hover:bg-gray-750 ${
                      isATM ? 'bg-blue-900/10' : ''
                    }`}
                  >
                    {/* Call Bid */}
                    <td className={`px-2 py-2 text-right ${callITM ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
                      {row.call?.bid.toFixed(2) || '-'}
                    </td>
                    {/* Call Ask */}
                    <td className={`px-2 py-2 text-right ${callITM ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
                      {row.call?.ask.toFixed(2) || '-'}
                    </td>
                    {/* Call Volume */}
                    <td className={`px-2 py-2 text-right text-gray-500 ${row.call && row.call.volume > 1000 ? 'font-bold text-yellow-400' : ''}`}>
                      {row.call?.volume || '-'}
                    </td>
                    
                    {/* Strike */}
                    <td className={`px-2 py-2 text-center font-semibold ${
                      isATM ? 'text-blue-400' : 'text-white'
                    }`}>
                      {row.strike.toFixed(0)}
                    </td>
                    
                    {/* Put Volume */}
                    <td className={`px-2 py-2 text-right text-gray-500 ${row.put && row.put.volume > 1000 ? 'font-bold text-yellow-400' : ''}`}>
                      {row.put?.volume || '-'}
                    </td>
                    {/* Put Bid */}
                    <td className={`px-2 py-2 text-right ${putITM ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                      {row.put?.bid.toFixed(2) || '-'}
                    </td>
                    {/* Put Ask */}
                    <td className={`px-2 py-2 text-right ${putITM ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                      {row.put?.ask.toFixed(2) || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
