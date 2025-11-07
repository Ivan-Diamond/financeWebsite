'use client'

import { useEffect, useState } from 'react'
import { WidgetProps } from '../../types'
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils'

export default function Watchlist({ id, config, onConfigChange }: WidgetProps) {
  const [quotes, setQuotes] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [newSymbol, setNewSymbol] = useState('')
  const [addError, setAddError] = useState('')
  
  const symbols = config.symbols || ['AAPL', 'TSLA', 'NVDA']

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const response = await fetch(`/api/market/quotes?symbols=${symbols.join(',')}`)
        const data = await response.json()
        
        if (data.success) {
          const quotesMap: Record<string, any> = {}
          data.data.forEach((quote: any) => {
            if (quote.symbol) quotesMap[quote.symbol] = quote
          })
          setQuotes(quotesMap)
        }
      } catch (err) {
        console.error('Failed to fetch watchlist:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchQuotes()
    // Update every 3 seconds - you have premium tier, no worries about API calls
    const interval = setInterval(fetchQuotes, config.refreshInterval || 3000)
    return () => clearInterval(interval)
  }, [symbols.join(','), config.refreshInterval])

  const handleAddSymbol = () => {
    const symbol = newSymbol.trim().toUpperCase()
    
    if (!symbol) {
      setAddError('Enter a symbol')
      return
    }
    
    if (symbols.includes(symbol)) {
      setAddError('Already in list')
      return
    }
    
    if (symbol.length > 5) {
      setAddError('Invalid symbol')
      return
    }
    
    const updatedSymbols = [...symbols, symbol]
    onConfigChange({ ...config, symbols: updatedSymbols })
    setNewSymbol('')
    setAddError('')
  }

  const handleRemoveSymbol = (symbolToRemove: string) => {
    if (symbols.length <= 1) {
      return // Keep at least one symbol
    }
    
    const updatedSymbols = symbols.filter(s => s !== symbolToRemove)
    onConfigChange({ ...config, symbols: updatedSymbols })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSymbol()
    } else {
      setAddError('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Add Symbol */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="Add symbol..."
            className="flex-1 bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            maxLength={5}
          />
          <button
            onClick={handleAddSymbol}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded font-semibold transition-colors"
            title="Add symbol"
          >
            +
          </button>
        </div>
        {addError && (
          <div className="text-red-400 text-[10px] mt-1">{addError}</div>
        )}
        <div className="text-xs text-gray-500 mt-1">
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
              <th className="px-3 py-1.5 font-semibold w-8"></th>
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol) => {
              const quote = quotes[symbol]
              return (
                <tr key={symbol} className="border-b border-gray-700 hover:bg-gray-750 transition-colors group">
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
                  <td className="px-3 py-2">
                    {symbols.length > 1 && (
                      <button
                        onClick={() => handleRemoveSymbol(symbol)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs font-bold transition-opacity"
                        title="Remove symbol"
                      >
                        ×
                      </button>
                    )}
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
