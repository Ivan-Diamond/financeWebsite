// ============================================
// USER & AUTH TYPES
// ============================================

export interface User {
  id: string
  username: string
  name?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface UserWithSettings extends User {
  settings?: UserSettings | null
}

export interface UserSettings {
  id: string
  userId: string
  theme: 'dark' | 'light'
  defaultLayoutId?: string | null
}

// ============================================
// DASHBOARD TYPES
// ============================================

export type WidgetType = 'ticker' | 'chart' | 'options_table' | 'watchlist' | 'news'

export interface Widget {
  id: string
  layoutId: string
  type: WidgetType
  gridX: number
  gridY: number
  gridW: number
  gridH: number
  config: WidgetConfig
  createdAt: Date
  updatedAt: Date
}

export interface WidgetConfig {
  symbol?: string
  symbols?: string[]
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  chartType?: 'line' | 'candlestick' | 'area'
  showVolume?: boolean
  indicators?: string[]
  [key: string]: any // Allow custom widget settings
}

export interface Layout {
  id: string
  userId: string
  name: string
  isDefault: boolean
  gridConfig: GridConfig
  widgets: Widget[]
  createdAt: Date
  updatedAt: Date
}

export interface GridConfig {
  cols: number
  rowHeight: number
  compactType?: 'vertical' | 'horizontal' | null
  margin?: [number, number]
  containerPadding?: [number, number]
}

// React Grid Layout item type
export interface GridLayoutItem {
  i: string // widget ID
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  static?: boolean
  isDraggable?: boolean
  isResizable?: boolean
}

// ============================================
// MARKET DATA TYPES
// ============================================

export interface MarketQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high?: number
  low?: number
  open?: number
  previousClose?: number
  timestamp: number
}

export interface OptionsContract {
  symbol: string
  strike: number
  expiry: string
  type: 'call' | 'put'
  delta?: number
  gamma?: number
  theta?: number
  vega?: number
  rho?: number
  impliedVolatility?: number
  volume: number
  openInterest: number
  bid: number
  ask: number
  last: number
}

export interface CandlestickData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ============================================
// WEBSOCKET TYPES
// ============================================

export interface WebSocketMessage {
  type: 'quote' | 'trade' | 'error' | 'connection' | 'subscription'
  data?: any
  message?: string
}

export interface SubscriptionMessage {
  action: 'subscribe' | 'unsubscribe'
  symbols: string[]
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  limit: number
  hasMore: boolean
}
