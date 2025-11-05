'use client'

import { useState, useMemo } from 'react'
import { Responsive, WidthProvider, Layout as GridLayout } from 'react-grid-layout'
import { useDashboardStore } from '@/stores/dashboardStore'
import { GRID_BREAKPOINTS, GRID_COLS, GRID_ROW_HEIGHT, GRID_MARGIN, GRID_PADDING, WidgetType } from './types'
import { getWidgetMetadata } from './widgets/registry'
import { WidgetWrapper } from './WidgetWrapper'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

export function DashboardGrid() {
  // Use proper selectors for reactive subscriptions
  const widgets = useDashboardStore(state => state.widgets)
  const updateWidgetLayout = useDashboardStore(state => state.updateWidgetLayout)
  const removeWidget = useDashboardStore(state => state.removeWidget)
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg')

  // Convert widgets to grid layout format
  const layouts = useMemo(() => {
    const layoutsByBreakpoint: Record<string, GridLayout[]> = {
      lg: [],
      md: [],
      sm: [],
      xs: [],
    }

    widgets.forEach((widget, index) => {
      const metadata = getWidgetMetadata(widget.type as WidgetType)
      const { constraints } = metadata

      // Create layout for each breakpoint
      Object.keys(layoutsByBreakpoint).forEach((breakpoint) => {
        const cols = GRID_COLS[breakpoint as keyof typeof GRID_COLS]
        
        // Calculate position (stack vertically for simplicity)
        const w = Math.min(constraints.defaultW, cols)
        const h = constraints.defaultH
        const x = 0
        const y = index * h

        layoutsByBreakpoint[breakpoint].push({
          i: widget.id,
          x,
          y,
          w,
          h,
          minW: constraints.minW,
          minH: constraints.minH,
          maxW: constraints.maxW,
          maxH: constraints.maxH,
        })
      })
    })

    return layoutsByBreakpoint
  }, [widgets])

  // Handle layout change (drag/resize)
  const handleLayoutChange = (currentLayout: GridLayout[], allLayouts: Record<string, GridLayout[]>) => {
    // Update widget positions in store
    currentLayout.forEach((item) => {
      updateWidgetLayout(item.i, {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      })
    })
  }

  // Handle breakpoint change
  const handleBreakpointChange = (newBreakpoint: string) => {
    setCurrentBreakpoint(newBreakpoint)
  }

  if (widgets.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)] bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Your Dashboard is Empty
          </h2>
          <p className="text-gray-400 mb-6">
            Click "Add Widget" above to start building your custom dashboard
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-grid-container h-full w-full overflow-auto scrollbar-custom">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={GRID_BREAKPOINTS}
        cols={GRID_COLS}
        rowHeight={GRID_ROW_HEIGHT}
        margin={GRID_MARGIN}
        containerPadding={GRID_PADDING}
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={handleBreakpointChange}
        isDraggable={true}
        isResizable={true}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        draggableHandle=".widget-drag-handle"
        draggableCancel="button,.widget-button"
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="widget-container">
            <WidgetWrapper
              widget={widget}
              onRemove={() => removeWidget(widget.id)}
            />
          </div>
        ))}
      </ResponsiveGridLayout>

      <style jsx global>{`
        .dashboard-grid-container {
          background: linear-gradient(to bottom, #111827 0%, #1f2937 100%);
          padding: 16px;
          min-height: 100%;
        }

        /* Ensure ReactGridLayout has proper height */
        .dashboard-grid-container .react-grid-layout {
          min-height: 100%;
        }

        /* Custom Scrollbar Styling */
        .scrollbar-custom::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        .scrollbar-custom::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 6px;
        }

        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 6px;
          border: 2px solid #1f2937;
        }

        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }

        .scrollbar-custom::-webkit-scrollbar-corner {
          background: #1f2937;
        }

        /* Firefox scrollbar */
        .scrollbar-custom {
          scrollbar-width: thin;
          scrollbar-color: #4b5563 #1f2937;
        }

        .widget-container {
          background: transparent;
        }

        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }

        .react-grid-item.resizing {
          transition: none;
          z-index: 100;
        }

        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
          opacity: 0.9;
          transform: scale(1.02);
        }

        .react-grid-placeholder {
          background: rgba(59, 130, 246, 0.15);
          border: 2px dashed rgba(59, 130, 246, 0.4);
          border-radius: 12px;
          transition: all 150ms ease;
        }

        .react-resizable-handle {
          z-index: 50;
        }

        .react-resizable-handle-se {
          bottom: 2px;
          right: 2px;
          cursor: se-resize;
          width: 20px;
          height: 20px;
        }

        .react-resizable-handle-se::after {
          content: '';
          position: absolute;
          bottom: 3px;
          right: 3px;
          width: 10px;
          height: 10px;
          border-right: 2px solid rgba(96, 165, 250, 0.6);
          border-bottom: 2px solid rgba(96, 165, 250, 0.6);
          border-radius: 0 0 2px 0;
        }

        .react-grid-item:hover .react-resizable-handle-se::after {
          border-right-color: rgba(96, 165, 250, 1);
          border-bottom-color: rgba(96, 165, 250, 1);
        }
      `}</style>
    </div>
  )
}
