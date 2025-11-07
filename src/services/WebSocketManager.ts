/**
 * Centralized WebSocket Manager
 * 
 * - Maintains persistent connections (never disconnects)
 * - Reference-counted subscriptions
 * - Auto-aggregates seconds data
 * - Single source of truth for market data
 */

import { useMarketStore } from '@/stores/marketStore'

type MessageHandler = (message: any) => void
type ConnectionHandler = (connected: boolean) => void

interface SubscriptionRegistry {
  stocks: Map<string, Set<string>>      // symbol -> Set of widget IDs
  options: Map<string, Set<string>>     // contractId -> Set of widget IDs
}

export class WebSocketManager {
  private static instance: WebSocketManager | null = null
  
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 2000
  private isReconnecting = false
  private isConnected = false
  
  // Handlers
  private messageHandlers: Set<MessageHandler> = new Set()
  private connectionHandlers: Set<ConnectionHandler> = new Set()
  
  // Subscription registry with reference counting
  private subscriptions: SubscriptionRegistry = {
    stocks: new Map(),
    options: new Map(),
  }
  
  // Active subscriptions sent to server
  private activeStockSubscriptions: Set<string> = new Set()
  private activeOptionSubscriptions: Set<string> = new Set()
  
  private constructor() {
    // Use wss:// in production, ws:// in development
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000'
    this.url = `${protocol}//${host}/api/socket`
    
    console.log('🎯 WebSocketManager initialized')
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }
  
  /**
   * Connect to WebSocket server (called once on app start)
   */
  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isReconnecting) {
      return
    }
    
    console.log('🔌 WebSocketManager connecting...')
    
    try {
      this.ws = new WebSocket(this.url)
      
      this.ws.onopen = () => {
        console.log('✅ WebSocketManager connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.isReconnecting = false
        this.notifyConnectionHandlers(true)
        
        // Resubscribe to all active subscriptions
        this.resubscribeAll()
      }
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse message:', error)
        }
      }
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocketManager error:', error)
      }
      
      this.ws.onclose = () => {
        console.log('❌ WebSocketManager disconnected')
        this.isConnected = false
        this.ws = null
        this.notifyConnectionHandlers(false)
        this.attemptReconnect()
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      this.attemptReconnect()
    }
  }
  
  /**
   * Subscribe to stock symbol (with reference counting)
   */
  public subscribeToStock(symbol: string, widgetId: string): void {
    const upperSymbol = symbol.toUpperCase()
    
    // Add to registry
    if (!this.subscriptions.stocks.has(upperSymbol)) {
      this.subscriptions.stocks.set(upperSymbol, new Set())
    }
    this.subscriptions.stocks.get(upperSymbol)!.add(widgetId)
    
    // Send subscription if not already active
    if (!this.activeStockSubscriptions.has(upperSymbol)) {
      this.sendStockSubscription([upperSymbol])
      this.activeStockSubscriptions.add(upperSymbol)
      console.log(`📊 Subscribed to ${upperSymbol} (first subscriber: ${widgetId})`)
    } else {
      console.log(`📊 ${upperSymbol} already subscribed (added ${widgetId})`)
    }
  }
  
  /**
   * Unsubscribe from stock symbol (with reference counting)
   */
  public unsubscribeFromStock(symbol: string, widgetId: string): void {
    const upperSymbol = symbol.toUpperCase()
    
    // Remove from registry
    const subscribers = this.subscriptions.stocks.get(upperSymbol)
    if (subscribers) {
      subscribers.delete(widgetId)
      
      // Only unsubscribe if no more subscribers
      if (subscribers.size === 0) {
        this.subscriptions.stocks.delete(upperSymbol)
        this.sendStockUnsubscription([upperSymbol])
        this.activeStockSubscriptions.delete(upperSymbol)
        console.log(`📊 Unsubscribed from ${upperSymbol} (no more subscribers)`)
      } else {
        console.log(`📊 ${upperSymbol} still has ${subscribers.size} subscribers`)
      }
    }
  }
  
  /**
   * Subscribe to option contracts (with reference counting)
   */
  public subscribeToOptions(contractIds: string[], widgetId: string): void {
    const newSubscriptions: string[] = []
    
    contractIds.forEach(contractId => {
      // Add to registry
      if (!this.subscriptions.options.has(contractId)) {
        this.subscriptions.options.set(contractId, new Set())
      }
      this.subscriptions.options.get(contractId)!.add(widgetId)
      
      // Track new subscriptions
      if (!this.activeOptionSubscriptions.has(contractId)) {
        newSubscriptions.push(contractId)
        this.activeOptionSubscriptions.add(contractId)
      }
    })
    
    // Send new subscriptions
    if (newSubscriptions.length > 0) {
      this.sendOptionSubscription(newSubscriptions)
      console.log(`📡 Subscribed to ${newSubscriptions.length} option contracts (widget: ${widgetId})`)
    }
  }
  
  /**
   * Unsubscribe from option contracts (with reference counting)
   */
  public unsubscribeFromOptions(contractIds: string[], widgetId: string): void {
    const toUnsubscribe: string[] = []
    
    contractIds.forEach(contractId => {
      const subscribers = this.subscriptions.options.get(contractId)
      if (subscribers) {
        subscribers.delete(widgetId)
        
        // Only unsubscribe if no more subscribers
        if (subscribers.size === 0) {
          this.subscriptions.options.delete(contractId)
          toUnsubscribe.push(contractId)
          this.activeOptionSubscriptions.delete(contractId)
        }
      }
    })
    
    // Send unsubscriptions
    if (toUnsubscribe.length > 0) {
      this.sendOptionUnsubscription(toUnsubscribe)
      console.log(`📡 Unsubscribed from ${toUnsubscribe.length} option contracts (no more subscribers)`)
    }
  }
  
  /**
   * Handle incoming message
   */
  private handleMessage(message: any): void {
    const marketStore = useMarketStore.getState()
    
    if (message.type === 'quote') {
      const data = message.data
      
      // Store raw tick data
      marketStore.addTick(data.symbol, {
        symbol: data.symbol,
        timestamp: data.timestamp,
        price: data.price,
        volume: data.volume || 0,
      })
      
      // Store quote
      marketStore.setQuote(data.symbol, data)
      
    } else if (message.type === 'option_update') {
      const data = message.data
      
      // Store raw tick data for option
      marketStore.addTick(data.contractId, {
        symbol: data.contractId,
        timestamp: data.timestamp,
        price: data.price,
        volume: data.volume || 0,
      })
      
      // Store quote with bid/ask/last for options
      marketStore.setQuote(data.contractId, {
        symbol: data.contractId,
        price: data.price || data.last || 0,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        volume: data.volume || 0,
        timestamp: data.timestamp,
        // Options-specific fields
        bid: data.bid,
        ask: data.ask,
        last: data.last || data.price,
      })
    }
    
    // Notify handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.error('Message handler error:', error)
      }
    })
  }
  
  /**
   * Send stock subscription to server
   */
  private sendStockSubscription(symbols: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        symbols,
      }))
    }
  }
  
  /**
   * Send stock unsubscription to server
   */
  private sendStockUnsubscription(symbols: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        symbols,
      }))
    }
  }
  
  /**
   * Send option subscription to server
   */
  private sendOptionSubscription(contractIds: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe_options',
        contractIds,
      }))
    }
  }
  
  /**
   * Send option unsubscription to server
   */
  private sendOptionUnsubscription(contractIds: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe_options',
        contractIds,
      }))
    }
  }
  
  /**
   * Resubscribe to all active subscriptions (after reconnect)
   */
  private resubscribeAll(): void {
    // Resubscribe to stocks
    if (this.activeStockSubscriptions.size > 0) {
      const symbols = Array.from(this.activeStockSubscriptions)
      this.sendStockSubscription(symbols)
      console.log(`🔄 Resubscribed to ${symbols.length} stock symbols`)
    }
    
    // Resubscribe to options
    if (this.activeOptionSubscriptions.size > 0) {
      const contractIds = Array.from(this.activeOptionSubscriptions)
      this.sendOptionSubscription(contractIds)
      console.log(`🔄 Resubscribed to ${contractIds.length} option contracts`)
    }
  }
  
  /**
   * Attempt reconnection
   */
  private attemptReconnect(): void {
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
  
  /**
   * Notify connection handlers
   */
  private notifyConnectionHandlers(connected: boolean): void {
    // Update market store
    const marketStore = useMarketStore.getState()
    marketStore.setConnected(connected)
    
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected)
      } catch (error) {
        console.error('Connection handler error:', error)
      }
    })
  }
  
  /**
   * Register message handler
   */
  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }
  
  /**
   * Register connection handler
   */
  public onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler)
    // Immediately notify of current status
    handler(this.isConnected)
    return () => this.connectionHandlers.delete(handler)
  }
  
  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected
  }
}

// Export singleton instance
export const wsManager = WebSocketManager.getInstance()
