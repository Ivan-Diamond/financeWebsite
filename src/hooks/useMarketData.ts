/**
 * Simplified Market Data Hook
 * 
 * Usage: const candleData = useMarketData(symbol, interval)
 * 
 * - Auto-subscribes on mount
 * - Auto-unsubscribes on unmount (with reference counting)
 * - Returns candles for requested interval
 * - No manual subscription management needed
 */

import { useEffect, useState, useMemo } from 'react'
import { useMarketStore } from '@/stores/marketStore'
import { wsManager } from '@/services/WebSocketManager'

// Generate unique widget ID for subscription tracking
const generateWidgetId = () => `widget-${Math.random().toString(36).substr(2, 9)}`

/**
 * Hook for accessing market data (stocks)
 */
export function useMarketData(symbol: string, interval: string = '5m') {
  const [widgetId] = useState(() => generateWidgetId())
  const [isConnected, setIsConnected] = useState(wsManager.getConnectionStatus())
  
  // Get candle data from store
  const candleData = useMarketStore(state => state.getCandles(symbol, interval))
  const quote = useMarketStore(state => state.quotes.get(symbol))
  
  // Subscribe on mount, unsubscribe on unmount
  useEffect(() => {
    if (!symbol) return
    
    // Subscribe to symbol
    wsManager.subscribeToStock(symbol, widgetId)
    
    // Cleanup: unsubscribe
    return () => {
      wsManager.unsubscribeFromStock(symbol, widgetId)
    }
  }, [symbol, widgetId])
  
  // Listen to connection status
  useEffect(() => {
    const unsubscribe = wsManager.onConnection(setIsConnected)
    return unsubscribe
  }, [])
  
  return {
    candleData,
    quote,
    isConnected,
  }
}

/**
 * Hook for accessing option contract data
 */
export function useOptionsData(contractIds: string[]) {
  const [widgetId] = useState(() => generateWidgetId())
  const [isConnected, setIsConnected] = useState(wsManager.getConnectionStatus())
  
  // Get quotes for all contracts
  const quotes = useMarketStore(state => {
    const result = new Map()
    contractIds.forEach(id => {
      const quote = state.quotes.get(id)
      if (quote) {
        result.set(id, quote)
      }
    })
    return result
  })
  
  // Subscribe on mount, unsubscribe on unmount
  useEffect(() => {
    if (contractIds.length === 0) return
    
    // Subscribe to option contracts
    wsManager.subscribeToOptions(contractIds, widgetId)
    
    // Cleanup: unsubscribe
    return () => {
      wsManager.unsubscribeFromOptions(contractIds, widgetId)
    }
  }, [contractIds.join(','), widgetId]) // Use join for stable dependency
  
  // Listen to connection status
  useEffect(() => {
    const unsubscribe = wsManager.onConnection(setIsConnected)
    return unsubscribe
  }, [])
  
  return {
    quotes,
    isConnected,
  }
}

/**
 * Hook for connection status only
 */
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(wsManager.getConnectionStatus())
  
  useEffect(() => {
    const unsubscribe = wsManager.onConnection(setIsConnected)
    return unsubscribe
  }, [])
  
  return isConnected
}
