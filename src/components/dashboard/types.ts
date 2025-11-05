import { ReactNode } from 'react'
import { Layout as GridLayout } from 'react-grid-layout'

/**
 * Widget type definitions
 */
export type WidgetType = 
  | 'price-ticker'
  | 'live-chart'
  | 'watchlist'
  | 'options-chain'
  | 'greeks-matrix'
  | 'options-flow'

export type WidgetCategory = 'stocks' | 'options' | 'utilities'

/**
 * Widget configuration interface
 */
export interface WidgetConfig {
  // Common settings
  symbol?: string
  symbols?: string[]
  refreshInterval?: number
  
  // Chart settings
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  chartType?: 'line' | 'candlestick' | 'area'
  showVolume?: boolean
  
  // Options settings
  expiry?: string
  expiryDays?: number
  strikeRange?: number
  showGreeks?: boolean
  showIV?: boolean
  showOI?: boolean
  greek?: 'delta' | 'gamma' | 'theta' | 'vega' | 'rho'
  
  // Watchlist settings
  sortBy?: 'symbol' | 'price' | 'changePercent' | 'volume'
  sortOrder?: 'asc' | 'desc'
  
  // Options flow settings
  minVolume?: number
  minPremium?: number
  timeframe?: '1h' | '4h' | '1d'
  
  // Custom properties
  [key: string]: any
}

/**
 * Widget instance
 */
export interface Widget {
  id: string
  type: WidgetType
  config: WidgetConfig
  createdAt: number
}

/**
 * Widget constraints
 */
export interface WidgetConstraints {
  minW: number
  minH: number
  maxW?: number
  maxH?: number
  defaultW: number
  defaultH: number
}

/**
 * Widget metadata for registry
 */
export interface WidgetMetadata {
  id: WidgetType
  name: string
  icon: string
  category: WidgetCategory
  description: string
  constraints: WidgetConstraints
  defaultConfig: WidgetConfig
  component: () => Promise<{ default: React.ComponentType<WidgetProps> }>
}

/**
 * Props passed to widget components
 */
export interface WidgetProps {
  id: string
  config: WidgetConfig
  onConfigChange: (config: WidgetConfig) => void
  onRemove: () => void
}

/**
 * Dashboard layout
 */
export interface DashboardLayout {
  lg: GridLayout[]
  md: GridLayout[]
  sm: GridLayout[]
  xs: GridLayout[]
}

/**
 * Grid breakpoints
 */
export const GRID_BREAKPOINTS = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
}

/**
 * Grid columns per breakpoint
 */
export const GRID_COLS = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
}

/**
 * Grid row height
 */
export const GRID_ROW_HEIGHT = 100

/**
 * Grid margin [x, y]
 */
export const GRID_MARGIN: [number, number] = [12, 12]

/**
 * Grid container padding [x, y]
 */
export const GRID_PADDING: [number, number] = [12, 12]
