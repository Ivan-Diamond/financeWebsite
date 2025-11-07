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

import { useEffect, useState, useRef } from 'react'
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
 * Manages subscriptions only - does not return quotes to avoid re-render loops
 */
export function useOptionsData(contractIds: string[]) {
  const [widgetId] = useState(() => generateWidgetId())
  const [isConnected, setIsConnected] = useState(wsManager.getConnectionStatus())
  const currentContractsRef = useRef<string[]>([])
  
  // Subscribe/unsubscribe with proper cleanup
  useEffect(() => {
    const currentContracts = currentContractsRef.current
    const contractIdsKey = contractIds.join(',')
    const currentKey = currentContracts.join(',')
    
    // Skip if contracts haven't changed
    if (contractIdsKey === currentKey) {
      return
    }
    
    // Unsubscribe from old contracts if any
    if (currentContracts.length > 0) {
      wsManager.unsubscribeFromOptions(currentContracts, widgetId)
    }
    
    // Subscribe to new contracts if any
    if (contractIds.length > 0) {
      wsManager.subscribeToOptions(contractIds, widgetId)
    }
    
    // Update ref
    currentContractsRef.current = contractIds
    
    // Cleanup on unmount: unsubscribe from whatever is current at that time
    return () => {
      if (currentContractsRef.current.length > 0) {
        wsManager.unsubscribeFromOptions(currentContractsRef.current, widgetId)
      }
    }
  }, [contractIds.join(','), widgetId])
  
  // Listen to connection status
  useEffect(() => {
    const unsubscribe = wsManager.onConnection(setIsConnected)
    return unsubscribe
  }, [])
  
  return {
    isConnected,
  }
}

/**
 * Hook for accessing live quote data for a single symbol
 * Simpler than useMarketData - just for price/quote display widgets
 */
export function useMarketQuote(symbol: string) {
  const [widgetId] = useState(() => generateWidgetId())
  const [isConnected, setIsConnected] = useState(wsManager.getConnectionStatus())
  
  // IMPORTANT: Don't return quotes here to avoid re-render issues
  // Widgets should access quotes directly from store when needed
  
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
    isConnected,
  }
}

/**
 * Hook for accessing multiple quotes at once (e.g., for watchlists)
 * IMPORTANT: Only manages subscriptions, does not return quotes
 * Widgets should access quotes directly from store to avoid re-render loops
 */
export function useMarketQuotes(symbols: string[]) {
  const [widgetId] = useState(() => generateWidgetId())
  const [isConnected, setIsConnected] = useState(wsManager.getConnectionStatus())
  
  // Subscribe to all symbols
  useEffect(() => {
    if (symbols.length === 0) return
    
    // Subscribe to each symbol
    symbols.forEach(symbol => {
      wsManager.subscribeToStock(symbol, widgetId)
    })
    
    // Cleanup: unsubscribe from all
    return () => {
      symbols.forEach(symbol => {
        wsManager.unsubscribeFromStock(symbol, widgetId)
      })
    }
  }, [symbols.join(','), widgetId])
  
  // Listen to connection status
  useEffect(() => {
    const unsubscribe = wsManager.onConnection(setIsConnected)
    return unsubscribe
  }, [])
  
  return {
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
