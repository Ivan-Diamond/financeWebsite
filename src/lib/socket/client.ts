import { useEffect, useRef, useCallback, useState } from 'react'
import { useMarketStore } from '@/stores/marketStore'
import { ServerMessage, QuoteMessage, ClientMessage } from './types'

/**
 * WebSocket client for browser
 */
class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 2000
  private isReconnecting = false
  private messageHandlers: Set<(message: ServerMessage) => void> = new Set()
  private connectionHandlers: Set<(connected: boolean) => void> = new Set()

  constructor(url: string) {
    this.url = url
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isReconnecting) {
      return
    }

    console.log('🔌 Connecting to WebSocket server...')

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('✅ Connected to WebSocket server')
        this.reconnectAttempts = 0
        this.isReconnecting = false
        this.notifyConnectionHandlers(true)
      }

      this.ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse server message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      this.ws.onclose = () => {
        console.log('❌ Disconnected from WebSocket server')
        this.ws = null
        this.notifyConnectionHandlers(false)
        this.attemptReconnect()
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.attemptReconnect()
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.reconnectAttempts = 0
    this.isReconnecting = false
  }

  /**
   * Subscribe to symbols
   */
  subscribe(symbols: string[]) {
    if (!this.isConnected()) {
      console.warn('Cannot subscribe: not connected')
      return
    }

    const message: ClientMessage = {
      type: 'subscribe',
      symbols: symbols.map(s => s.toUpperCase()),
      timestamp: Date.now(),
    }

    this.send(message)
  }

  /**
   * Unsubscribe from symbols
   */
  unsubscribe(symbols: string[]) {
    if (!this.isConnected()) {
      return
    }

    const message: ClientMessage = {
      type: 'unsubscribe',
      symbols: symbols.map(s => s.toUpperCase()),
      timestamp: Date.now(),
    }

    this.send(message)
  }

  /**
   * Subscribe to option contracts
   */
  subscribeToOptions(contractIds: string[]) {
    if (!this.isConnected()) {
      console.warn('Cannot subscribe to options: not connected')
      return
    }

    const message: ClientMessage = {
      type: 'subscribe_options',
      contractIds: contractIds.map(id => id.toUpperCase()),
      timestamp: Date.now(),
    }

    this.send(message)
  }

  /**
   * Unsubscribe from option contracts
   */
  unsubscribeFromOptions(contractIds: string[]) {
    if (!this.isConnected()) {
      return
    }

    const message: ClientMessage = {
      type: 'unsubscribe_options',
      contractIds: contractIds.map(id => id.toUpperCase()),
      timestamp: Date.now(),
    }

    this.send(message)
  }

  /**
   * Send message to server
   */
  private send(message: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: ServerMessage) {
    // Notify all handlers
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message)
      } catch (error) {
        console.error('Message handler error:', error)
      }
    })
  }

  /**
   * Register message handler
   */
  onMessage(handler: (message: ServerMessage) => void) {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  /**
   * Register connection status handler
   */
  onConnection(handler: (connected: boolean) => void) {
    this.connectionHandlers.add(handler)
    return () => this.connectionHandlers.delete(handler)
  }

  /**
   * Notify connection handlers
   */
  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected)
      } catch (error) {
        console.error('Connection handler error:', error)
      }
    })
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect() {
    if (this.isReconnecting) {
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      return
    }

    this.isReconnecting = true
    this.reconnectAttempts++

    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5)
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`)

    setTimeout(() => {
      this.isReconnecting = false
      this.connect()
    }, delay)
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null

/**
 * Get WebSocket client instance
 */
function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    // Use wss:// in production, ws:// in development
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/socket`
    wsClient = new WebSocketClient(wsUrl)
  }
  return wsClient
}

/**
 * React hook for WebSocket connection
 */
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const clientRef = useRef<WebSocketClient | null>(null)
  const marketStore = useMarketStore()

  useEffect(() => {
    // Get or create client
    clientRef.current = getWebSocketClient()
    const client = clientRef.current

    // Connect
    client.connect()

    // Handle connection status
    const unsubConnection = client.onConnection((connected) => {
      setIsConnected(connected)
      marketStore.setConnected(connected)
    })

    // Handle messages
    const unsubMessage = client.onMessage((message) => {
      if (message.type === 'quote') {
        const quoteMsg = message as QuoteMessage
        const data = quoteMsg.data
        
        // Store quote
        marketStore.setQuote(data.symbol, data)
        
        // Also create/update candle for chart
        marketStore.addCandle(data.symbol, {
          time: data.timestamp,
          open: data.price, // We'll use price as all OHLC for now
          high: data.price,
          low: data.price,
          close: data.price,
          volume: data.volume || 0,
        })
      } else if (message.type === 'option_update') {
        // Store option updates in market store
        const optionMsg = message as any
        const data = optionMsg.data
        
        // Store quote
        marketStore.setQuote(data.contractId, {
          symbol: data.contractId,
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          volume: data.volume,
          timestamp: data.timestamp,
        })
        
        // Also create/update candle
        marketStore.addCandle(data.contractId, {
          time: data.timestamp,
          open: data.open || data.price,
          high: data.high || data.price,
          low: data.low || data.price,
          close: data.price,
          volume: data.volume || 0,
        })
      }
    })

    // Cleanup
    return () => {
      unsubConnection()
      unsubMessage()
    }
  }, [marketStore])

  const subscribe = useCallback((symbols: string[]) => {
    if (clientRef.current) {
      clientRef.current.subscribe(symbols)
      marketStore.subscribe(symbols)
    }
  }, [marketStore])

  const unsubscribe = useCallback((symbols: string[]) => {
    if (clientRef.current) {
      clientRef.current.unsubscribe(symbols)
      marketStore.unsubscribe(symbols)
    }
  }, [marketStore])

  const subscribeToOptions = useCallback((contractIds: string[]) => {
    if (clientRef.current) {
      clientRef.current.subscribeToOptions(contractIds)
      // Store as subscribed
      contractIds.forEach(id => marketStore.subscribe([id]))
    }
  }, [marketStore])

  const unsubscribeFromOptions = useCallback((contractIds: string[]) => {
    if (clientRef.current) {
      clientRef.current.unsubscribeFromOptions(contractIds)
      // Remove from subscribed
      contractIds.forEach(id => marketStore.unsubscribe([id]))
    }
  }, [marketStore])

  return {
    isConnected,
    subscribe,
    unsubscribe,
    subscribeToOptions,
    unsubscribeFromOptions,
  }
}

/**
 * React hook for subscribing to specific symbols
 */
export function useMarketData(symbols: string[]) {
  const { subscribe, unsubscribe, isConnected } = useWebSocket()
  const marketStore = useMarketStore()

  useEffect(() => {
    if (symbols.length > 0 && isConnected) {
      subscribe(symbols)

      return () => {
        unsubscribe(symbols)
      }
    }
  }, [symbols.join(','), isConnected, subscribe, unsubscribe])

  // Get quotes for requested symbols
  const quotes = symbols.map(symbol => ({
    symbol,
    data: marketStore.quotes.get(symbol.toUpperCase()),
  }))

  return {
    quotes,
    isConnected,
  }
}
