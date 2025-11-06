/**
 * WebSocket message types for client-server communication
 */

export type ClientMessageType = 'subscribe' | 'unsubscribe' | 'subscribe_options' | 'unsubscribe_options' | 'ping'
export type ServerMessageType = 'quote' | 'trade' | 'option_update' | 'error' | 'connected' | 'subscribed' | 'subscribed_options' | 'unsubscribed' | 'pong'

// Client → Server messages
export interface ClientMessage {
  type: ClientMessageType
  symbols?: string[]
  contractIds?: string[]
  timestamp?: number
}

export interface SubscribeMessage extends ClientMessage {
  type: 'subscribe'
  symbols: string[]
}

export interface UnsubscribeMessage extends ClientMessage {
  type: 'unsubscribe'
  symbols: string[]
}

export interface SubscribeOptionsMessage extends ClientMessage {
  type: 'subscribe_options'
  contractIds: string[]
}

export interface UnsubscribeOptionsMessage extends ClientMessage {
  type: 'unsubscribe_options'
  contractIds: string[]
}

// Server → Client messages
export interface ServerMessage {
  type: ServerMessageType
  data?: any
  message?: string
  timestamp: number
}

export interface QuoteMessage extends ServerMessage {
  type: 'quote'
  data: {
    symbol: string
    price: number
    change: number
    changePercent: number
    volume: number
    timestamp: number
  }
}

export interface TradeMessage extends ServerMessage {
  type: 'trade'
  data: {
    symbol: string
    price: number
    size: number
    timestamp: number
  }
}

export interface OptionUpdateMessage extends ServerMessage {
  type: 'option_update'
  data: {
    contractId: string
    price: number
    open: number
    high: number
    low: number
    change: number
    changePercent: number
    volume: number
    timestamp: number
  }
}

export interface ErrorMessage extends ServerMessage {
  type: 'error'
  message: string
}

export interface ConnectedMessage extends ServerMessage {
  type: 'connected'
  message: string
}

// Polygon.io WebSocket message types
export interface PolygonMessage {
  ev: string // Event type
  sym?: string // Symbol
  p?: number // Price
  s?: number // Size
  t?: number // Timestamp
  c?: number[] // Conditions
}

export interface PolygonAggregateMessage {
  ev: 'AM' | 'A' // Aggregate minute/second
  sym: string
  v: number // Volume
  av: number // Accumulated volume
  op: number // Open
  vw: number // Volume weighted average
  o: number // Open
  c: number // Close
  h: number // High
  l: number // Low
  a: number // Average/VWAP
  s: number // Start timestamp
  e: number // End timestamp
}

export interface PolygonTradeMessage {
  ev: 'T' // Trade
  sym: string
  p: number // Price
  s: number // Size
  t: number // Timestamp
  c: number[] // Conditions
}

export interface PolygonQuoteMessage {
  ev: 'Q' // Quote
  sym: string
  bp: number // Bid price
  ap: number // Ask price
  bs: number // Bid size
  as: number // Ask size
  t: number // Timestamp
}

export interface PolygonOptionsAggregateMessage {
  ev: 'A' // Aggregate
  sym: string // Contract ID (e.g., O:SPY251219C00650000)
  o: number // Open
  h: number // High
  l: number // Low
  c: number // Close (current price)
  v: number // Volume
  vw?: number // Volume weighted average
  s: number // Start timestamp
  e?: number // End timestamp
}
