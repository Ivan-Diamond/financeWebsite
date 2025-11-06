import { lazy } from 'react'
import { WidgetMetadata, WidgetType } from '../types'

/**
 * Widget Registry
 * Central definition of all available widgets
 */
export const WIDGET_REGISTRY: Record<WidgetType, WidgetMetadata> = {
  // ==================== STOCK WIDGETS ====================
  
  'price-ticker': {
    id: 'price-ticker',
    name: 'Price Ticker',
    icon: '💹',
    category: 'stocks',
    description: 'Real-time stock price with key metrics',
    constraints: {
      minW: 2,
      minH: 2,
      maxW: 6,
      maxH: 4,
      defaultW: 3,
      defaultH: 3,
    },
    defaultConfig: {
      // No symbol - will use global activeSymbol
      showVolume: true,
      showOI: false,
      refreshInterval: 5000,
    },
    component: () => import('./PriceTicker/PriceTicker'),
  },
  
  'live-chart': {
    id: 'live-chart',
    name: 'Live Chart',
    icon: '📈',
    category: 'stocks',
    description: 'Candlestick chart with real-time updates',
    constraints: {
      minW: 4,
      minH: 3,
      maxW: 12,
      maxH: 8,
      defaultW: 6,
      defaultH: 4,
    },
    defaultConfig: {
      // No symbol - will use global activeSymbol
      interval: '5m',
      chartType: 'candlestick',
      showVolume: true,
      refreshInterval: 5000,
    },
    component: () => import('./LiveChart/LiveChart'),
  },
  
  'watchlist': {
    id: 'watchlist',
    name: 'Watchlist',
    icon: '📊',
    category: 'stocks',
    description: 'Multi-symbol tracking table',
    constraints: {
      minW: 4,
      minH: 4,
      maxW: 12,
      maxH: 10,
      defaultW: 5,
      defaultH: 5,
    },
    defaultConfig: {
      symbols: ['AAPL', 'TSLA', 'NVDA', 'GOOGL', 'MSFT'],
      sortBy: 'changePercent',
      sortOrder: 'desc',
      refreshInterval: 5000,
    },
    component: () => import('./Watchlist/Watchlist'),
  },
  
  // ==================== OPTIONS WIDGETS ====================
  
  'options-chain': {
    id: 'options-chain',
    name: 'Options Chain',
    icon: '⚡',
    category: 'options',
    description: 'Full options chain with Greeks',
    constraints: {
      minW: 6,
      minH: 4,
      maxW: 12,
      maxH: 10,
      defaultW: 8,
      defaultH: 6,
    },
    defaultConfig: {
      // No symbol - will use global activeSymbol
      expiryDays: 30,
      strikeRange: 10,
      showGreeks: true,
      showIV: true,
      showOI: true,
      refreshInterval: 10000,
    },
    component: () => import('./OptionsChain/OptionsChain'),
  },
  
  'greeks-matrix': {
    id: 'greeks-matrix',
    name: 'Greeks Matrix',
    icon: 'Δ',
    category: 'options',
    description: 'Visual heatmap of option Greeks',
    constraints: {
      minW: 4,
      minH: 3,
      maxW: 10,
      maxH: 8,
      defaultW: 6,
      defaultH: 4,
    },
    defaultConfig: {
      // No symbol - will use global activeSymbol
      greek: 'delta',
      expiryDays: 30,
      refreshInterval: 10000,
    },
    component: () => import('./GreeksMatrix/GreeksMatrix'),
  },
  
  'options-flow': {
    id: 'options-flow',
    name: 'Options Flow',
    icon: '🌊',
    category: 'options',
    description: 'Unusual options activity tracker',
    constraints: {
      minW: 4,
      minH: 3,
      maxW: 8,
      maxH: 8,
      defaultW: 5,
      defaultH: 4,
    },
    defaultConfig: {
      symbols: ['AAPL', 'TSLA', 'NVDA'],
      minVolume: 1000,
      minPremium: 100000, // $100K
      timeframe: '1h',
      refreshInterval: 30000,
    },
    component: () => import('./OptionsFlow/OptionsFlow'),
  },
  
  'options-analytics': {
    id: 'options-analytics',
    name: 'Options Analytics',
    icon: '📊',
    category: 'options',
    description: 'Comprehensive options analysis with live charts and bid/ask tables',
    constraints: {
      minW: 8,
      minH: 6,
      maxW: 12,
      maxH: 12,
      defaultW: 10,
      defaultH: 8,
    },
    defaultConfig: {
      // No symbol - will use global activeSymbol
      strikeCount: 5,
      showMiniGraphs: true,
      interval: '1m',
      refreshInterval: 30000,
    },
    component: () => import('./OptionsAnalytics/OptionsAnalytics'),
  },
}

/**
 * Get widget metadata by type
 */
export function getWidgetMetadata(type: WidgetType): WidgetMetadata {
  return WIDGET_REGISTRY[type]
}

/**
 * Get all widgets by category
 */
export function getWidgetsByCategory(category: string): WidgetMetadata[] {
  return Object.values(WIDGET_REGISTRY).filter(
    (widget) => widget.category === category
  )
}

/**
 * Get all widget categories
 */
export function getCategories(): string[] {
  const categories = new Set<string>()
  Object.values(WIDGET_REGISTRY).forEach((widget) => {
    categories.add(widget.category)
  })
  return Array.from(categories)
}

/**
 * Create a new widget instance with default config
 */
export function createWidget(type: WidgetType, overrideConfig?: Partial<any>): {
  id: string
  type: WidgetType
  config: any
  createdAt: number
} {
  const metadata = getWidgetMetadata(type)
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    config: {
      ...metadata.defaultConfig,
      ...overrideConfig,
    },
    createdAt: Date.now(),
  }
}
