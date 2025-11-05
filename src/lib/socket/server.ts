import WebSocket from 'ws'
import { 
  PolygonMessage, 
  PolygonAggregateMessage, 
  PolygonTradeMessage,
  ServerMessage,
  QuoteMessage 
} from './types'

/**
 * WebSocket Manager - Server Side
 * Manages Polygon.io WebSocket connection and client subscriptions
 */
class WebSocketManager {
  private polygonWs: WebSocket | null = null
  private clients: Map<string, WebSocket> = new Map()
  private subscriptions: Map<string, Set<string>> = new Map() // symbol → Set<clientId>
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 5000
  private isConnecting = false
  private lastPrices: Map<string, number> = new Map() // Cache for change calculation

  constructor() {
    this.connectToPolygon()
  }

  /**
   * Connect to Polygon.io WebSocket
   */
  private connectToPolygon() {
    if (this.isConnecting || this.polygonWs?.readyState === WebSocket.OPEN) {
      return
    }

    const apiKey = process.env.POLYGON_API_KEY
    if (!apiKey) {
      console.error('❌ POLYGON_API_KEY not configured')
      return
    }

    this.isConnecting = true
    const wsUrl = `wss://socket.polygon.io/stocks`

    console.log('🔌 Connecting to Polygon.io WebSocket...')

    this.polygonWs = new WebSocket(wsUrl)

    this.polygonWs.on('open', () => {
      console.log('✅ Connected to Polygon.io WebSocket')
      this.isConnecting = false
      this.reconnectAttempts = 0

      // Authenticate
      this.polygonWs?.send(JSON.stringify({
        action: 'auth',
        params: apiKey
      }))

      // Resubscribe to all active symbols
      this.resubscribeAll()
    })

    this.polygonWs.on('message', (data: WebSocket.Data) => {
      try {
        const messages = JSON.parse(data.toString())
        if (Array.isArray(messages)) {
          messages.forEach((msg) => this.handlePolygonMessage(msg))
        }
      } catch (error) {
        console.error('Failed to parse Polygon message:', error)
      }
    })

    this.polygonWs.on('error', (error) => {
      console.error('Polygon WebSocket error:', error)
    })

    this.polygonWs.on('close', () => {
      console.log('❌ Disconnected from Polygon.io WebSocket')
      this.isConnecting = false
      this.polygonWs = null
      this.attemptReconnect()
    })
  }

  /**
   * Handle messages from Polygon.io
   */
  private handlePolygonMessage(msg: PolygonMessage) {
    // Handle status messages
    if (msg.ev === 'status') {
      console.log('📡 Polygon status:', msg)
      return
    }

    // Handle aggregate (OHLC) messages - most common for stock data
    if (msg.ev === 'AM' || msg.ev === 'A') {
      const aggregate = msg as unknown as PolygonAggregateMessage
      this.broadcastQuote({
        symbol: aggregate.sym,
        price: aggregate.c, // Close price
        volume: aggregate.v,
        timestamp: aggregate.e,
      })
      return
    }

    // Handle trade messages
    if (msg.ev === 'T') {
      const trade = msg as unknown as PolygonTradeMessage
      this.broadcastQuote({
        symbol: trade.sym,
        price: trade.p,
        volume: 0, // Trade doesn't have volume in this context
        timestamp: trade.t,
      })
      return
    }

    // Handle quote messages (bid/ask)
    if (msg.ev === 'Q') {
      const quote = msg as any
      const midPrice = (quote.bp + quote.ap) / 2
      this.broadcastQuote({
        symbol: quote.sym,
        price: midPrice,
        volume: 0,
        timestamp: quote.t,
      })
    }
  }

  /**
   * Broadcast quote update to subscribed clients
   */
  private broadcastQuote(data: {
    symbol: string
    price: number
    volume: number
    timestamp: number
  }) {
    const { symbol, price, volume, timestamp } = data
    
    // Calculate change
    const lastPrice = this.lastPrices.get(symbol) || price
    const change = price - lastPrice
    const changePercent = lastPrice > 0 ? (change / lastPrice) * 100 : 0

    // Update cache
    this.lastPrices.set(symbol, price)

    // Get subscribed clients for this symbol
    const clientIds = this.subscriptions.get(symbol)
    if (!clientIds || clientIds.size === 0) return

    const message: QuoteMessage = {
      type: 'quote',
      data: {
        symbol,
        price,
        change,
        changePercent,
        volume,
        timestamp,
      },
      timestamp: Date.now(),
    }

    // Broadcast to all subscribed clients
    clientIds.forEach((clientId) => {
      const client = this.clients.get(clientId)
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message))
      }
    })
  }

  /**
   * Add a client connection
   */
  addClient(clientId: string, ws: WebSocket) {
    this.clients.set(clientId, ws)
    console.log(`👤 Client connected: ${clientId} (Total: ${this.clients.size})`)

    // Send connected message
    const message: ServerMessage = {
      type: 'connected',
      message: 'Connected to FinanceDash WebSocket',
      timestamp: Date.now(),
    }
    ws.send(JSON.stringify(message))
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string) {
    this.clients.delete(clientId)
    console.log(`👋 Client disconnected: ${clientId} (Total: ${this.clients.size})`)

    // Unsubscribe from all symbols
    this.subscriptions.forEach((clientIds, symbol) => {
      if (clientIds.has(clientId)) {
        clientIds.delete(clientId)
        
        // If no more clients for this symbol, unsubscribe from Polygon
        if (clientIds.size === 0) {
          this.unsubscribeFromPolygon([symbol])
          this.subscriptions.delete(symbol)
        }
      }
    })
  }

  /**
   * Subscribe client to symbols
   */
  subscribe(clientId: string, symbols: string[]) {
    const normalizedSymbols = symbols.map(s => s.toUpperCase())
    const newSymbols: string[] = []

    normalizedSymbols.forEach((symbol) => {
      if (!this.subscriptions.has(symbol)) {
        this.subscriptions.set(symbol, new Set())
        newSymbols.push(symbol)
      }
      this.subscriptions.get(symbol)!.add(clientId)
    })

    // Subscribe to new symbols on Polygon
    if (newSymbols.length > 0) {
      this.subscribeToPolygon(newSymbols)
    }

    console.log(`📊 Client ${clientId} subscribed to: ${normalizedSymbols.join(', ')}`)

    // Send confirmation
    const client = this.clients.get(clientId)
    if (client && client.readyState === WebSocket.OPEN) {
      const message: ServerMessage = {
        type: 'subscribed',
        data: { symbols: normalizedSymbols },
        timestamp: Date.now(),
      }
      client.send(JSON.stringify(message))
    }
  }

  /**
   * Unsubscribe client from symbols
   */
  unsubscribe(clientId: string, symbols: string[]) {
    const normalizedSymbols = symbols.map(s => s.toUpperCase())
    const emptySymbols: string[] = []

    normalizedSymbols.forEach((symbol) => {
      const clientIds = this.subscriptions.get(symbol)
      if (clientIds) {
        clientIds.delete(clientId)
        
        if (clientIds.size === 0) {
          emptySymbols.push(symbol)
          this.subscriptions.delete(symbol)
        }
      }
    })

    // Unsubscribe from Polygon if no more clients
    if (emptySymbols.length > 0) {
      this.unsubscribeFromPolygon(emptySymbols)
    }

    console.log(`📊 Client ${clientId} unsubscribed from: ${normalizedSymbols.join(', ')}`)
  }

  /**
   * Subscribe to symbols on Polygon.io
   */
  private subscribeToPolygon(symbols: string[]) {
    if (!this.polygonWs || this.polygonWs.readyState !== WebSocket.OPEN) {
      console.warn('⚠️  Cannot subscribe: Polygon WebSocket not connected')
      return
    }

    // Subscribe to aggregates (per second) and trades
    const message = {
      action: 'subscribe',
      params: symbols.map(s => `A.${s}`).join(',') // A = aggregates
    }

    this.polygonWs.send(JSON.stringify(message))
    console.log(`📡 Subscribed to Polygon: ${symbols.join(', ')}`)
  }

  /**
   * Unsubscribe from symbols on Polygon.io
   */
  private unsubscribeFromPolygon(symbols: string[]) {
    if (!this.polygonWs || this.polygonWs.readyState !== WebSocket.OPEN) {
      return
    }

    const message = {
      action: 'unsubscribe',
      params: symbols.map(s => `A.${s}`).join(',')
    }

    this.polygonWs.send(JSON.stringify(message))
    console.log(`📡 Unsubscribed from Polygon: ${symbols.join(', ')}`)
  }

  /**
   * Resubscribe to all active symbols (after reconnect)
   */
  private resubscribeAll() {
    const allSymbols = Array.from(this.subscriptions.keys())
    if (allSymbols.length > 0) {
      this.subscribeToPolygon(allSymbols)
    }
  }

  /**
   * Attempt to reconnect to Polygon
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Giving up.')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts

    console.log(`🔄 Attempting reconnect #${this.reconnectAttempts} in ${delay}ms...`)

    setTimeout(() => {
      this.connectToPolygon()
    }, delay)
  }

  /**
   * Get active subscriptions count
   */
  getStats() {
    return {
      clients: this.clients.size,
      symbols: this.subscriptions.size,
      polygonConnected: this.polygonWs?.readyState === WebSocket.OPEN,
    }
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager()
