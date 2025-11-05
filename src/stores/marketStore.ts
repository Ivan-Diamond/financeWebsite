import { create } from 'zustand'
import { MarketQuote } from '@/types'

interface MarketState {
  quotes: Map<string, MarketQuote>
  subscribedSymbols: Set<string>
  isConnected: boolean
  
  // Actions
  setQuote: (symbol: string, quote: MarketQuote) => void
  setQuotes: (quotes: Map<string, MarketQuote>) => void
  subscribe: (symbols: string[]) => void
  unsubscribe: (symbols: string[]) => void
  setConnected: (connected: boolean) => void
  clearQuotes: () => void
}

export const useMarketStore = create<MarketState>((set, get) => ({
  quotes: new Map(),
  subscribedSymbols: new Set(),
  isConnected: false,
  
  setQuote: (symbol, quote) => set((state) => {
    const newQuotes = new Map(state.quotes)
    newQuotes.set(symbol, quote)
    return { quotes: newQuotes }
  }),
  
  setQuotes: (quotes) => set({ quotes }),
  
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
  
  clearQuotes: () => set({ quotes: new Map() }),
}))
