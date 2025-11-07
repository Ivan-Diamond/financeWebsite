'use client'

import { WidgetProps } from '../../types'
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils'
import { useMarketQuotes } from '@/hooks/useMarketData'

export default function Watchlist({ id, config }: WidgetProps) {
  const symbols = config.symbols || ['AAPL', 'TSLA', 'NVDA']
  
  // Use WebSocketManager for real-time quotes
  const { quotes, isConnected } = useMarketQuotes(symbols)

  return (
    <div className="flex flex-col h-full">
      {/* Header - Compact */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="text-xs text-gray-500">
          {symbols.length} symbols
        </div>
      </div>

      {/* Table - Compact */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-750 sticky top-0">
            <tr className="text-left text-[10px] text-gray-500 uppercase tracking-wider">
              <th className="px-3 py-1.5 font-semibold">Symbol</th>
              <th className="px-3 py-1.5 font-semibold text-right">Price</th>
              <th className="px-3 py-1.5 font-semibold text-right">Change</th>
              <th className="px-3 py-1.5 font-semibold text-right">Vol</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol) => {
              const quote = quotes[symbol]
              return (
                <tr key={symbol} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="px-3 py-2 font-semibold text-white text-sm">{symbol}</td>
                  <td className="px-3 py-2 text-right text-white text-sm">
                    {quote ? formatCurrency(quote.price) : '-'}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold text-sm ${
                    quote ? getChangeColor(quote.change) : 'text-gray-400'
                  }`}>
                    {quote ? formatPercent(quote.changePercent) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-400 text-xs">
                    {quote && quote.volume
                      ? (quote.volume / 1000000).toFixed(1) + 'M'
                      : '-'
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
