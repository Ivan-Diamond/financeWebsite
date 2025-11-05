'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils'

export default function TestPage() {
  const [testSymbols] = useState(['AAPL', 'TSLA', 'NVDA'])
  const [restQuote, setRestQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [liveQuotes, setLiveQuotes] = useState<Record<string, any>>({})
  const [isPolling, setIsPolling] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Test single REST API endpoint
  const testRestAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/market/quote/AAPL')
      const data = await response.json()
      setRestQuote(data)
    } catch (error) {
      console.error('REST API test failed:', error)
      setRestQuote({ success: false, error: 'Failed to fetch' })
    } finally {
      setLoading(false)
    }
  }

  // Fetch multiple quotes
  const fetchLiveQuotes = async () => {
    try {
      const response = await fetch(`/api/market/quotes?symbols=${testSymbols.join(',')}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        const quotesMap: Record<string, any> = {}
        data.data.forEach((quote: any) => {
          if (quote.symbol && !quote.error) {
            quotesMap[quote.symbol] = quote
          }
        })
        setLiveQuotes(quotesMap)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch live quotes:', error)
    }
  }

  // Start polling on mount
  useEffect(() => {
    // Fetch immediately
    fetchLiveQuotes()
    testRestAPI()

    // Poll every 5 seconds
    const interval = setInterval(() => {
      if (isPolling) {
        fetchLiveQuotes()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isPolling])

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          🧪 Real-Time Data Test Page
        </h1>

        {/* Polling Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Polling Status</h2>
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isPolling ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-gray-300">
                  {isPolling ? 'Active (updates every 5 seconds)' : 'Paused'}
                </span>
              </div>
              {lastUpdate && (
                <div className="text-sm text-gray-400 mt-2">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsPolling(!isPolling)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              {isPolling ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>

        {/* REST API Test */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">REST API Test (AAPL)</h2>
          
          <button
            onClick={testRestAPI}
            disabled={loading}
            className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch Quote'}
          </button>

          {restQuote && (
            <div className="bg-gray-700 rounded p-4">
              {restQuote.success ? (
                <div className="space-y-2 text-sm">
                  <div className="text-gray-300">
                    <span className="font-semibold">Symbol:</span> {restQuote.data.symbol}
                  </div>
                  <div className="text-gray-300">
                    <span className="font-semibold">Price:</span> {formatCurrency(restQuote.data.price)}
                  </div>
                  <div className="text-gray-300">
                    <span className="font-semibold">Change:</span>{' '}
                    <span className={getChangeColor(restQuote.data.change)}>
                      {formatPercent(restQuote.data.changePercent)}
                    </span>
                  </div>
                  <div className="text-gray-300">
                    <span className="font-semibold">Volume:</span> {restQuote.data.volume?.toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-red-400">Error: {restQuote.error}</div>
              )}
            </div>
          )}
        </div>

        {/* Live Quotes (Polling) */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            Live Market Data (Auto-Refresh)
          </h2>
          
          <div className="text-sm text-gray-400 mb-4">
            Watching: {testSymbols.join(', ')} • Updates every 5 seconds
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testSymbols.map((symbol) => {
              const data = liveQuotes[symbol]
              
              return (
                <div
                  key={symbol}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                >
                  <div className="text-lg font-bold text-white mb-2">{symbol}</div>
                  
                  {data ? (
                    <div className="space-y-2">
                      <div className="text-2xl font-semibold text-white">
                        {formatCurrency(data.price)}
                      </div>
                      <div className={`text-sm font-medium ${getChangeColor(data.change)}`}>
                        {data.change > 0 ? '+' : ''}{formatCurrency(data.change)}
                        {' '}({formatPercent(data.changePercent)})
                      </div>
                      <div className="text-xs text-gray-400">
                        Volume: {data.volume?.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {data.high && `H: ${formatCurrency(data.high)} `}
                        {data.low && `L: ${formatCurrency(data.low)}`}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      {isPolling ? 'Loading...' : 'Paused'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            <strong>📡 How it works:</strong> The page automatically fetches quotes every 5 seconds using the REST API. 
            This provides near-real-time updates without WebSocket complexity. 
            {' '}Click "Pause" to stop updates, "Resume" to continue.
          </p>
        </div>

        <div className="mt-4 bg-green-500/10 border border-green-500 rounded-lg p-4">
          <p className="text-green-400 text-sm">
            <strong>✅ Advantage:</strong> This polling approach works everywhere (development, production, Vercel) 
            without complex WebSocket setup. Market data refreshes every 5 seconds, which is sufficient for most use cases.
          </p>
        </div>

        <div className="mt-4 bg-yellow-500/10 border border-yellow-500 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            <strong>⚠️ Note:</strong> Market is currently closed. Data shown is from previous trading day. 
            During market hours (Mon-Fri 9:30 AM - 4:00 PM ET), you'll see live updates every 5 seconds.
          </p>
        </div>
      </div>
    </div>
  )
}
