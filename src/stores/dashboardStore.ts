import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WidgetType } from '@/components/dashboard/types'

// Simplified widget interface for Phase 3
interface DashboardWidget {
  id: string
  type: WidgetType
  config: Record<string, any>
  createdAt: number
  layout?: {
    x: number
    y: number
    w: number
    h: number
  }
}

interface DashboardState {
  widgets: DashboardWidget[]
  activeSymbol: string
  symbolList: string[]
  
  // Widget Actions
  addWidget: (widget: DashboardWidget) => void
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void
  updateWidgetConfig: (widgetId: string, config: Record<string, any>) => void
  updateWidgetLayout: (widgetId: string, layout: { x: number; y: number; w: number; h: number }) => void
  removeWidget: (widgetId: string) => void
  clearWidgets: () => void
  loadPreset: (widgets: DashboardWidget[]) => void
  
  // Symbol Actions
  setActiveSymbol: (symbol: string) => void
  addSymbol: (symbol: string) => void
  removeSymbol: (symbol: string) => void
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgets: [],
      activeSymbol: 'AAPL',
      symbolList: ['AAPL', 'TSLA', 'NVDA', 'GOOGL', 'MSFT', 'AMZN', 'META', 'SPY'],
      
      addWidget: (widget) => set((state) => ({
        widgets: [...state.widgets, widget],
      })),
      
      updateWidget: (widgetId, updates) => set((state) => ({
        widgets: state.widgets.map((w) =>
          w.id === widgetId ? { ...w, ...updates } : w
        ),
      })),
      
      updateWidgetConfig: (widgetId, config) => set((state) => ({
        widgets: state.widgets.map((w) =>
          w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w
        ),
      })),
      
      updateWidgetLayout: (widgetId, layout) => set((state) => ({
        widgets: state.widgets.map((w) =>
          w.id === widgetId ? { ...w, layout } : w
        ),
      })),
      
      removeWidget: (widgetId) => set((state) => ({
        widgets: state.widgets.filter((w) => w.id !== widgetId),
      })),
      
      clearWidgets: () => set({ widgets: [] }),
      
      loadPreset: (widgets) => set({ widgets }),
      
      // Symbol Actions
      setActiveSymbol: (symbol) => set({ activeSymbol: symbol.toUpperCase() }),
      
      addSymbol: (symbol) => set((state) => {
        const upperSymbol = symbol.toUpperCase()
        if (!state.symbolList.includes(upperSymbol)) {
          return { 
            symbolList: [...state.symbolList, upperSymbol],
            activeSymbol: upperSymbol // Auto-switch to newly added symbol
          }
        }
        return { activeSymbol: upperSymbol } // Just switch to it if it exists
      }),
      
      removeSymbol: (symbol) => set((state) => ({
        symbolList: state.symbolList.filter(s => s !== symbol.toUpperCase()),
      })),
    }),
    {
      name: 'dashboard-storage', // localStorage key
      version: 1, // Increment this to trigger migration
      migrate: (persistedState: any, version: number) => {
        // Migration: Remove symbol from all widget configs
        if (version === 0) {
          if (persistedState?.widgets) {
            persistedState.widgets = persistedState.widgets.map((widget: any) => {
              const { symbol, ...restConfig } = widget.config
              return {
                ...widget,
                config: restConfig, // Config without symbol property
              }
            })
          }
          // Add SPY if not in list
          if (persistedState?.symbolList && !persistedState.symbolList.includes('SPY')) {
            persistedState.symbolList = [...persistedState.symbolList, 'SPY']
          }
        }
        return persistedState
      },
    }
  )
)
