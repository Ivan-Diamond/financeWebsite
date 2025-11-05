'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatPercent, getChangeColor } from '@/lib/utils'

export default function TestPage() {
  const [testSymbols] = useState(['AAPL', 'TSLA', 'NVDA'])
  const [restQuote, setRestQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [liveQuotes, setLiveQuotes] = useState<any[]>([])
  const [isPolling, setIsPolling] = useState(false)

  // Test REST API
  const testRestAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/market/quote/AAPL')
      const data = await response.json()
      setRestQuote(data)
    } catch (error) {
      console.error('REST API test failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testRestAPI()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          🧪 Real-Time Data Test Page
        </h1>

        {/* API Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">REST API Status</h2>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${restQuote ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-gray-300">
              {restQuote ? 'API Connected' : 'Testing...'}
            </span>
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

        {/* WebSocket Real-Time Quotes */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            WebSocket Real-Time Quotes
          </h2>
          
          <div className="text-sm text-gray-400 mb-4">
            Subscribed to: {testSymbols.join(', ')}
          </div>

          <div className="text-gray-400 text-sm">
            Polling-based real-time data. See the working test page at /dashboard/test-working
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            <strong>📡 How it works:</strong> The REST API fetches historical/snapshot data on demand. 
            The WebSocket provides real-time streaming updates when the market is open. 
            If you don't see WebSocket updates, the market may be closed or your Polygon.io plan may not include real-time data.
          </p>
        </div>

        <div className="mt-4 bg-yellow-500/10 border border-yellow-500 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            <strong>⚠️ Note:</strong> Polygon.io's free tier has limited real-time data. 
            For live updates, you need the Starter plan ($99/mo) or higher. 
            Previous day data will work with any plan.
          </p>
        </div>
      </div>
    </div>
  )
}
