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

interface MarketState {
  quotes: Map<string, MarketQuote>
  candles: Map<string, Candle[]> // symbol -> array of candles
  subscribedSymbols: Set<string>
  isConnected: boolean
  
  // Actions
  setQuote: (symbol: string, quote: MarketQuote) => void
  setQuotes: (quotes: Map<string, MarketQuote>) => void
  addCandle: (symbol: string, candle: Candle) => void
  setCandles: (symbol: string, candles: Candle[]) => void
  subscribe: (symbols: string[]) => void
  unsubscribe: (symbols: string[]) => void
  setConnected: (connected: boolean) => void
  clearQuotes: () => void
}

export const useMarketStore = create<MarketState>((set, get) => ({
  quotes: new Map(),
  candles: new Map(),
  subscribedSymbols: new Set(),
  isConnected: false,
  
  setQuote: (symbol, quote) => set((state) => {
    const newQuotes = new Map(state.quotes)
    newQuotes.set(symbol, quote)
    return { quotes: newQuotes }
  }),
  
  setQuotes: (quotes) => set({ quotes }),
  
  addCandle: (symbol, candle) => set((state) => {
    const newCandles = new Map(state.candles)
    // Create a NEW array (don't mutate existing)
    const existingCandles = [...(newCandles.get(symbol) || [])]
    
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
    
    newCandles.set(symbol, existingCandles)
    return { candles: newCandles }
  }),
  
  setCandles: (symbol, candles) => set((state) => {
    const newCandles = new Map(state.candles)
    newCandles.set(symbol, candles)
    return { candles: newCandles }
  }),
  
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
  
  clearQuotes: () => set({ quotes: new Map(), candles: new Map() }),
}))

export type { Candle }
