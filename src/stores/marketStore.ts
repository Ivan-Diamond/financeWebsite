import { create } from 'zustand'
import { MarketQuote } from '@/types'

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface RawTick {
  symbol: string
  timestamp: number
  price: number
  volume: number
}

interface MarketState {
  quotes: Map<string, MarketQuote>
  candles: Map<string, Candle[]> // Key format: "symbol:interval" e.g. "AAPL:5m"
  ticks: Map<string, RawTick[]> // Raw tick data for aggregation
  subscribedSymbols: Set<string>
  isConnected: boolean
  
  // Actions
  setQuote: (symbol: string, quote: MarketQuote) => void
  setQuotes: (quotes: Map<string, MarketQuote>) => void
  addTick: (symbol: string, tick: RawTick) => void
  addCandle: (symbol: string, candle: Candle, interval?: string) => void
  setCandles: (symbol: string, candles: Candle[], interval?: string) => void
  getCandles: (symbol: string, interval?: string) => Candle[] | undefined
  subscribe: (symbols: string[]) => void
  unsubscribe: (symbols: string[]) => void
  setConnected: (isConnected: boolean) => void
  clearQuotes: () => void
}

export const useMarketStore = create<MarketState>((set, get) => ({
  quotes: new Map(),
  candles: new Map(),
  ticks: new Map(),
  subscribedSymbols: new Set(),
  isConnected: false,
  
  setQuote: (symbol, quote) => set((state) => {
    const newQuotes = new Map(state.quotes)
    newQuotes.set(symbol, quote)
    return { quotes: newQuotes }
  }),
  
  setQuotes: (quotes) => set({ quotes }),
  
  addTick: (symbol, tick) => set((state) => {
    const newTicks = new Map(state.ticks)
    const existingTicks = [...(newTicks.get(symbol) || [])]
    
    // Add new tick
    existingTicks.push(tick)
    
    // Keep only last 1000 ticks (configurable based on needs)
    if (existingTicks.length > 1000) {
      existingTicks.shift()
    }
    
    newTicks.set(symbol, existingTicks)
    return { ticks: newTicks }
  }),
  
  addCandle: (symbol, candle, interval = '5m') => set((state) => {
    const key = `${symbol}:${interval}`
    const newCandles = new Map(state.candles)
    // Create a NEW array (don't mutate existing)
    const existingCandles = [...(newCandles.get(key) || [])]
    
    // Check if we should update the last candle or add new one
    if (existingCandles.length > 0) {
      const lastCandle = existingCandles[existingCandles.length - 1]
      const timeDiff = candle.time - lastCandle.time
      
      // If within same second, update last candle
      if (timeDiff < 1000) {
        existingCandles[existingCandles.length - 1] = {
          ...lastCandle,
          high: Math.max(lastCandle.high, candle.high),
          low: Math.min(lastCandle.low, candle.low),
          close: candle.close,
          volume: lastCandle.volume + candle.volume,
        }
      } else {
        // Add new candle
        existingCandles.push(candle)
        // Keep only last 500 candles
        if (existingCandles.length > 500) {
          existingCandles.shift()
        }
      }
    } else {
      existingCandles.push(candle)
    }
    
    newCandles.set(key, existingCandles)
    return { candles: newCandles }
  }),
  
  setCandles: (symbol, candles, interval = '5m') => set((state) => {
    const key = `${symbol}:${interval}`
    const newCandles = new Map(state.candles)
    newCandles.set(key, candles)
    return { candles: newCandles }
  }),
  
  getCandles: (symbol, interval = '5m') => {
    const key = `${symbol}:${interval}`
    return get().candles.get(key)
  },
  
  subscribe: (symbols) => set((state) => {
    const newSubscribed = new Set(state.subscribedSymbols)
    symbols.forEach((symbol) => newSubscribed.add(symbol))
    return { subscribedSymbols: newSubscribed }
  }),
  
  unsubscribe: (symbols) => set((state) => {
    const newSubscribed = new Set(state.subscribedSymbols)
    symbols.forEach((symbol) => newSubscribed.delete(symbol))
    return { subscribedSymbols: newSubscribed }
  }),
  
  setConnected: (isConnected) => set({ isConnected }),
  
  clearQuotes: () => set({ quotes: new Map(), candles: new Map(), ticks: new Map() }),
}))

export type { Candle, RawTick }
