'use client'

import { useState } from 'react'
import { WidgetProps } from '../../types'

interface FlowItem {
  time: string
  symbol: string
  strike: number
  type: 'call' | 'put'
  premium: number
  volume: number
  signal: 'big' | 'buy' | 'sell' | 'mid'
}

export default function OptionsFlow({ id, config }: WidgetProps) {
  // Mock data for demonstration
  const [flows] = useState<FlowItem[]>([
    { time: '2:45 PM', symbol: 'AAPL', strike: 185, type: 'call', premium: 2500000, volume: 15230, signal: 'buy' },
    { time: '2:43 PM', symbol: 'TSLA', strike: 250, type: 'put', premium: 1800000, volume: 8940, signal: 'sell' },
    { time: '2:40 PM', symbol: 'NVDA', strike: 500, type: 'call', premium: 3200000, volume: 12100, signal: 'big' },
    { time: '2:38 PM', symbol: 'AAPL', strike: 180, type: 'put', premium: 890000, volume: 4560, signal: 'mid' },
  ])

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'big': return '🔥'
      case 'buy': return '🟢'
      case 'sell': return '🔴'
      default: return '🟡'
    }
  }

  const getSignalLabel = (signal: string) => {
    switch (signal) {
      case 'big': return 'Big'
      case 'buy': return 'Buy'
      case 'sell': return 'Sell'
      default: return 'Mid'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="text-sm font-semibold text-white">Options Flow</div>
        <div className="text-xs text-gray-400 mt-1">
          Tracking unusual activity
        </div>
      </div>

      {/* Flow Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-750 sticky top-0">
            <tr className="text-left text-gray-400">
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium text-right">Strike</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium text-right">Premium</th>
              <th className="px-3 py-2 font-medium text-right">Vol</th>
              <th className="px-3 py-2 font-medium text-center">Signal</th>
            </tr>
          </thead>
          <tbody>
            {flows.map((flow, i) => (
              <tr key={i} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-3 py-2 text-gray-400">{flow.time}</td>
                <td className="px-3 py-2 font-medium text-white">{flow.symbol}</td>
                <td className="px-3 py-2 text-right text-white">{flow.strike}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                    flow.type === 'call' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                  }`}>
                    {flow.type}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-white font-medium">
                  ${(flow.premium / 1000000).toFixed(2)}M
                </td>
                <td className="px-3 py-2 text-right text-gray-400">
                  {flow.volume.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-flex items-center space-x-1">
                    <span>{getSignalIcon(flow.signal)}</span>
                    <span className="text-gray-400 text-[10px]">{getSignalLabel(flow.signal)}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-700 bg-blue-900/10">
        <div className="text-xs text-blue-400">
          💡 Real-time flow data requires WebSocket connection (Phase 5)
        </div>
      </div>
    </div>
  )
}
