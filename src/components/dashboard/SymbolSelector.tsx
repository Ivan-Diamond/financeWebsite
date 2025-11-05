'use client'

import { useState, useRef, useEffect } from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'

export function SymbolSelector() {
  // Use proper selectors for reactive subscriptions
  const activeSymbol = useDashboardStore(state => state.activeSymbol)
  const symbolList = useDashboardStore(state => state.symbolList)
  const setActiveSymbol = useDashboardStore(state => state.setActiveSymbol)
  const addSymbol = useDashboardStore(state => state.addSymbol)
  const removeSymbol = useDashboardStore(state => state.removeSymbol)
  
  const [isOpen, setIsOpen] = useState(false)
  const [newSymbol, setNewSymbol] = useState('')
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  const handleAddSymbol = () => {
    if (newSymbol.trim()) {
      addSymbol(newSymbol.trim())
      setNewSymbol('')
      setShowInput(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSymbol()
    } else if (e.key === 'Escape') {
      setShowInput(false)
      setNewSymbol('')
    }
  }

  return (
    <div className="relative">
      {/* Active Symbol Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm font-medium border border-gray-600"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="font-bold">{activeSymbol}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-700">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Select Symbol
              </div>
            </div>

            {/* Symbol Grid */}
            <div className="p-3">
              <div className="grid grid-cols-3 gap-2">
                {symbolList.map((symbol) => (
                  <div key={symbol} className="relative group">
                    <button
                      onClick={() => {
                        setActiveSymbol(symbol)
                        setIsOpen(false)
                      }}
                      className={`w-full px-3 py-2 rounded text-sm font-semibold transition-colors ${
                        activeSymbol === symbol
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {symbol}
                    </button>
                    {symbolList.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`Remove ${symbol} from your list?`)) {
                            removeSymbol(symbol)
                            if (activeSymbol === symbol && symbolList.length > 1) {
                              setActiveSymbol(symbolList.find(s => s !== symbol) || 'AAPL')
                            }
                          }
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="Remove symbol"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Symbol Section */}
            <div className="border-t border-gray-700 p-3">
              {showInput ? (
                <div className="flex space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyPress}
                    placeholder="Enter symbol..."
                    className="flex-1 px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    maxLength={10}
                  />
                  <button
                    onClick={handleAddSymbol}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowInput(false)
                      setNewSymbol('')
                    }}
                    className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowInput(true)}
                  className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Symbol</span>
                </button>
              )}
            </div>

            {/* Info */}
            <div className="px-3 py-2 border-t border-gray-700 bg-blue-900/20">
              <div className="text-xs text-blue-400">
                💡 Active symbol applies to all single-symbol widgets
              </div>
            </div>
          </div>

          {/* Click outside to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false)
              setShowInput(false)
              setNewSymbol('')
            }}
          />
        </>
      )}
    </div>
  )
}
