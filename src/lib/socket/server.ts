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
  private stockWs: WebSocket | null = null
  private optionsWs: WebSocket | null = null
  private clients: Map<string, WebSocket> = new Map()
  private stockSubscriptions: Map<string, Set<string>> = new Map() // symbol → Set<clientId>
  private optionsSubscriptions: Map<string, Set<string>> = new Map() // contractId → Set<clientId>
  private reconnectAttempts = 0
  private optionsReconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 5000
  private isConnectingStock = false
  private isConnectingOptions = false
  private lastPrices: Map<string, number> = new Map() // Cache for change calculation

  constructor() {
    this.connectToStocks()
    this.connectToOptions()
  }

  /**
   * Connect to Stocks WebSocket
   */
  private connectToStocks() {
    if (this.isConnectingStock || this.stockWs?.readyState === WebSocket.OPEN) {
      return
    }

    const apiKey = process.env.POLYGON_API_KEY
    if (!apiKey) {
      console.error('❌ POLYGON_API_KEY not configured')
      return
    }

    this.isConnectingStock = true
    const wsUrl = `wss://socket.massive.com/stocks`

    console.log('🔌 Connecting to Massive.com Stocks WebSocket...')

    this.stockWs = new WebSocket(wsUrl)

    this.stockWs.on('open', () => {
      console.log('✅ Connected to Stocks WebSocket')
      this.isConnectingStock = false
      this.reconnectAttempts = 0

      // Authenticate
      this.stockWs?.send(JSON.stringify({
        action: 'auth',
        params: apiKey
      }))

      // Resubscribe to all active symbols
      this.resubscribeAllStocks()
    })

    this.stockWs.on('message', (data: WebSocket.Data) => {
      try {
        const messages = JSON.parse(data.toString())
        if (Array.isArray(messages)) {
          messages.forEach((msg) => this.handleStockMessage(msg))
        }
      } catch (error) {
        console.error('Failed to parse Stock message:', error)
      }
    })

    this.stockWs.on('error', (error) => {
      console.error('Stock WebSocket error:', error)
    })

    this.stockWs.on('close', () => {
      console.log('❌ Disconnected from Stocks WebSocket')
      this.isConnectingStock = false
      this.stockWs = null
      this.attemptReconnectStock()
    })
  }

  /**
   * Connect to Options WebSocket
   */
  private connectToOptions() {
    if (this.isConnectingOptions || this.optionsWs?.readyState === WebSocket.OPEN) {
      return
    }

    const apiKey = process.env.POLYGON_API_KEY
    if (!apiKey) {
      console.error('❌ POLYGON_API_KEY not configured')
      return
    }

    this.isConnectingOptions = true
    const wsUrl = `wss://socket.massive.com/options`

    console.log('🔌 Connecting to Massive.com Options WebSocket...')

    this.optionsWs = new WebSocket(wsUrl)

    this.optionsWs.on('open', () => {
      console.log('✅ Connected to Options WebSocket')
      this.isConnectingOptions = false
      this.optionsReconnectAttempts = 0

      // Authenticate
      this.optionsWs?.send(JSON.stringify({
        action: 'auth',
        params: apiKey
      }))

      // Resubscribe to all active option contracts
      this.resubscribeAllOptions()
    })

    this.optionsWs.on('message', (data: WebSocket.Data) => {
      try {
        const messages = JSON.parse(data.toString())
        if (Array.isArray(messages)) {
          messages.forEach((msg) => this.handleOptionsMessage(msg))
        }
      } catch (error) {
        console.error('Failed to parse Options message:', error)
      }
    })

    this.optionsWs.on('error', (error) => {
      console.error('Options WebSocket error:', error)
    })

    this.optionsWs.on('close', () => {
      console.log('❌ Disconnected from Options WebSocket')
      this.isConnectingOptions = false
      this.optionsWs = null
      this.attemptReconnectOptions()
    })
  }

  /**
   * Handle messages from Stock WebSocket
   */
  private handleStockMessage(msg: PolygonMessage) {
    // Handle status messages
    if (msg.ev === 'status') {
      console.log('📡 Polygon status:', msg)
      return
    }

    // Handle aggregate (OHLC) messages - most common for stock data
    if (msg.ev === 'AM' || msg.ev === 'A') {
      const aggregate = msg as unknown as PolygonAggregateMessage
      this.broadcastStockQuote({
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
      this.broadcastStockQuote({
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
      this.broadcastStockQuote({
        symbol: quote.sym,
        price: midPrice,
        volume: 0,
        timestamp: quote.t,
      })
    }
  }

  /**
   * Handle messages from Options WebSocket
   */
  private handleOptionsMessage(msg: any) {
    // Handle status messages
    if (msg.ev === 'status') {
      console.log('📡 Options status:', msg)
      return
    }

    // Handle aggregate messages for options
    // Format: { ev: 'A', sym: 'O:SPY251219C00650000', o: 5.20, h: 5.30, l: 5.15, c: 5.25, v: 100, ... }
    if (msg.ev === 'A' && msg.sym && msg.sym.startsWith('O:')) {
      this.broadcastOptionUpdate({
        contractId: msg.sym,
        price: msg.c, // Close price
        open: msg.o,
        high: msg.h,
        low: msg.l,
        volume: msg.v || 0,
        timestamp: msg.s || msg.e || Date.now(),
      })
      return
    }
  }

  /**
   * Broadcast stock quote update to subscribed clients
   */
  private broadcastStockQuote(data: {
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
    const clientIds = this.stockSubscriptions.get(symbol)
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
   * Broadcast option update to subscribed clients
   */
  private broadcastOptionUpdate(data: {
    contractId: string
    price: number
    open: number
    high: number
    low: number
    volume: number
    timestamp: number
  }) {
    const { contractId, price, open, high, low, volume, timestamp } = data
    
    // Calculate change
    const lastPrice = this.lastPrices.get(contractId) || price
    const change = price - lastPrice
    const changePercent = lastPrice > 0 ? (change / lastPrice) * 100 : 0

    // Update cache
    this.lastPrices.set(contractId, price)

    // Get subscribed clients for this contract
    const clientIds = this.optionsSubscriptions.get(contractId)
    if (!clientIds || clientIds.size === 0) return

    const message = {
      type: 'option_update',
      data: {
        contractId,
        price,
        open,
        high,
        low,
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

    // Unsubscribe from all stock symbols
    this.stockSubscriptions.forEach((clientIds, symbol) => {
      if (clientIds.has(clientId)) {
        clientIds.delete(clientId)
        
        if (clientIds.size === 0) {
          this.unsubscribeFromStocks([symbol])
          this.stockSubscriptions.delete(symbol)
        }
      }
    })

    // Unsubscribe from all option contracts
    this.optionsSubscriptions.forEach((clientIds, contractId) => {
      if (clientIds.has(clientId)) {
        clientIds.delete(clientId)
        
        if (clientIds.size === 0) {
          this.unsubscribeFromOptions([contractId])
          this.optionsSubscriptions.delete(contractId)
        }
      }
    })
  }

  /**
   * Subscribe client to stock symbols
   */
  subscribe(clientId: string, symbols: string[]) {
    const normalizedSymbols = symbols.map(s => s.toUpperCase())
    const newSymbols: string[] = []

    normalizedSymbols.forEach((symbol) => {
      if (!this.stockSubscriptions.has(symbol)) {
        this.stockSubscriptions.set(symbol, new Set())
        newSymbols.push(symbol)
      }
      this.stockSubscriptions.get(symbol)!.add(clientId)
    })

    // Subscribe to new symbols
    if (newSymbols.length > 0) {
      this.subscribeToStocks(newSymbols)
    }

    console.log(`📊 Client ${clientId} subscribed to stocks: ${normalizedSymbols.join(', ')}`)

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
   * Subscribe client to option contracts
   */
  subscribeToOptions(clientId: string, contractIds: string[]) {
    const normalizedContracts = contractIds.map(id => id.toUpperCase())
    const newContracts: string[] = []

    normalizedContracts.forEach((contractId) => {
      if (!this.optionsSubscriptions.has(contractId)) {
        this.optionsSubscriptions.set(contractId, new Set())
        newContracts.push(contractId)
      }
      this.optionsSubscriptions.get(contractId)!.add(clientId)
    })

    // Subscribe to new contracts
    if (newContracts.length > 0) {
      this.subscribeToOptionsWs(newContracts)
    }

    console.log(`📊 Client ${clientId} subscribed to options: ${normalizedContracts.join(', ')}`)

    // Send confirmation
    const client = this.clients.get(clientId)
    if (client && client.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribed_options',
        data: { contractIds: normalizedContracts },
        timestamp: Date.now(),
      }
      client.send(JSON.stringify(message))
    }
  }

  /**
   * Unsubscribe client from stock symbols
   */
  unsubscribe(clientId: string, symbols: string[]) {
    const normalizedSymbols = symbols.map(s => s.toUpperCase())
    const emptySymbols: string[] = []

    normalizedSymbols.forEach((symbol) => {
      const clientIds = this.stockSubscriptions.get(symbol)
      if (clientIds) {
        clientIds.delete(clientId)
        
        if (clientIds.size === 0) {
          emptySymbols.push(symbol)
          this.stockSubscriptions.delete(symbol)
        }
      }
    })

    if (emptySymbols.length > 0) {
      this.unsubscribeFromStocks(emptySymbols)
    }

    console.log(`📊 Client ${clientId} unsubscribed from stocks: ${normalizedSymbols.join(', ')}`)
  }

  /**
   * Unsubscribe client from option contracts
   */
  unsubscribeFromOptionsClient(clientId: string, contractIds: string[]) {
    const normalizedContracts = contractIds.map(id => id.toUpperCase())
    const emptyContracts: string[] = []

    normalizedContracts.forEach((contractId) => {
      const clientIds = this.optionsSubscriptions.get(contractId)
      if (clientIds) {
        clientIds.delete(clientId)
        
        if (clientIds.size === 0) {
          emptyContracts.push(contractId)
          this.optionsSubscriptions.delete(contractId)
        }
      }
    })

    if (emptyContracts.length > 0) {
      this.unsubscribeFromOptions(emptyContracts)
    }

    console.log(`📊 Client ${clientId} unsubscribed from options: ${normalizedContracts.join(', ')}`)
  }

  /**
   * Subscribe to stock symbols
   */
  private subscribeToStocks(symbols: string[]) {
    if (!this.stockWs || this.stockWs.readyState !== WebSocket.OPEN) {
      console.warn('⚠️  Cannot subscribe: Stock WebSocket not connected')
      return
    }

    const message = {
      action: 'subscribe',
      params: symbols.map(s => `A.${s}`).join(',') // A = aggregates
    }

    this.stockWs.send(JSON.stringify(message))
    console.log(`📡 Subscribed to stocks: ${symbols.join(', ')}`)
  }

  /**
   * Subscribe to option contracts
   */
  private subscribeToOptionsWs(contractIds: string[]) {
    if (!this.optionsWs || this.optionsWs.readyState !== WebSocket.OPEN) {
      console.warn('⚠️  Cannot subscribe: Options WebSocket not connected')
      return
    }

    const message = {
      action: 'subscribe',
      params: contractIds.map(id => `A.${id}`).join(',') // A.O:SPY251219C00650000
    }

    this.optionsWs.send(JSON.stringify(message))
    console.log(`📡 Subscribed to options: ${contractIds.join(', ')}`)
  }

  /**
   * Unsubscribe from stock symbols
   */
  private unsubscribeFromStocks(symbols: string[]) {
    if (!this.stockWs || this.stockWs.readyState !== WebSocket.OPEN) {
      return
    }

    const message = {
      action: 'unsubscribe',
      params: symbols.map(s => `A.${s}`).join(',')
    }

    this.stockWs.send(JSON.stringify(message))
    console.log(`📡 Unsubscribed from stocks: ${symbols.join(', ')}`)
  }

  /**
   * Unsubscribe from option contracts
   */
  private unsubscribeFromOptions(contractIds: string[]) {
    if (!this.optionsWs || this.optionsWs.readyState !== WebSocket.OPEN) {
      return
    }

    const message = {
      action: 'unsubscribe',
      params: contractIds.map(id => `A.${id}`).join(',')
    }

    this.optionsWs.send(JSON.stringify(message))
    console.log(`📡 Unsubscribed from options: ${contractIds.join(', ')}`)
  }

  /**
   * Resubscribe to all active stocks (after reconnect)
   */
  private resubscribeAllStocks() {
    const allSymbols = Array.from(this.stockSubscriptions.keys())
    if (allSymbols.length > 0) {
      this.subscribeToStocks(allSymbols)
    }
  }

  /**
   * Resubscribe to all active options (after reconnect)
   */
  private resubscribeAllOptions() {
    const allContracts = Array.from(this.optionsSubscriptions.keys())
    if (allContracts.length > 0) {
      this.subscribeToOptionsWs(allContracts)
    }
  }

  /**
   * Attempt to reconnect to Stock WebSocket
   */
  private attemptReconnectStock() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max Stock WebSocket reconnection attempts reached.')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts

    console.log(`🔄 Attempting Stock WebSocket reconnect #${this.reconnectAttempts} in ${delay}ms...`)

    setTimeout(() => {
      this.connectToStocks()
    }, delay)
  }

  /**
   * Attempt to reconnect to Options WebSocket
   */
  private attemptReconnectOptions() {
    if (this.optionsReconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max Options WebSocket reconnection attempts reached.')
      return
    }

    this.optionsReconnectAttempts++
    const delay = this.reconnectDelay * this.optionsReconnectAttempts

    console.log(`🔄 Attempting Options WebSocket reconnect #${this.optionsReconnectAttempts} in ${delay}ms...`)

    setTimeout(() => {
      this.connectToOptions()
    }, delay)
  }

  /**
   * Get active subscriptions count
   */
  getStats() {
    return {
      clients: this.clients.size,
      stockSymbols: this.stockSubscriptions.size,
      optionContracts: this.optionsSubscriptions.size,
      stockConnected: this.stockWs?.readyState === WebSocket.OPEN,
      optionsConnected: this.optionsWs?.readyState === WebSocket.OPEN,
    }
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager()
