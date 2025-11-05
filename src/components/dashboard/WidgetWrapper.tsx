'use client'

import { Suspense, lazy, useState } from 'react'
import { Widget, WidgetProps } from './types'
import { getWidgetMetadata } from './widgets/registry'
import { useDashboardStore } from '@/stores/dashboardStore'

interface WidgetWrapperProps {
  widget: Widget
  onRemove: () => void
}

export function WidgetWrapper({ widget, onRemove }: WidgetWrapperProps) {
  const [showConfig, setShowConfig] = useState(false)
  
  // Use proper selector for reactive subscription
  const updateWidgetConfig = useDashboardStore(state => state.updateWidgetConfig)
  
  const metadata = getWidgetMetadata(widget.type)
  const WidgetComponent = lazy(metadata.component)

  const handleConfigChange = (newConfig: any) => {
    updateWidgetConfig(widget.id, newConfig)
  }

  return (
    <div className="widget-wrapper h-full flex flex-col bg-gray-800 rounded-lg border border-gray-700 overflow-hidden shadow-lg hover:border-gray-600 transition-colors">
      {/* Widget Header - Compact */}
      <div className="widget-header flex items-center justify-between px-2 py-1.5 bg-gray-750 border-b border-gray-700 widget-drag-handle cursor-move">
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className="text-sm">{metadata.icon}</span>
          <span className="text-xs font-medium text-gray-200 truncate">
            {metadata.name}
          </span>
          {widget.config.symbol && (
            <span className="text-xs text-gray-500">
              {widget.config.symbol}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Settings Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowConfig(!showConfig)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Widget Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Remove Widget"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Widget Content */}
      <div className="widget-content flex-1 overflow-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        }>
          <WidgetComponent
            id={widget.id}
            config={widget.config}
            onConfigChange={handleConfigChange}
            onRemove={onRemove}
          />
        </Suspense>
      </div>

      {/* Configuration Panel (if shown) */}
      {showConfig && (
        <div className="widget-config-overlay absolute inset-0 bg-gray-900 bg-opacity-95 z-50 p-4 overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Widget Settings</h3>
            <button
              onClick={() => setShowConfig(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* TODO: Dynamic configuration form based on widget type */}
          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <label className="block mb-1">Symbol</label>
              <input
                type="text"
                value={widget.config.symbol || ''}
                onChange={(e) => handleConfigChange({ ...widget.config, symbol: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                placeholder="AAPL"
              />
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  if (confirm('Remove this widget?')) {
                    onRemove()
                    setShowConfig(false)
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Delete Widget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
