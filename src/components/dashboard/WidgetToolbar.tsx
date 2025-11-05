'use client'

import { useState } from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'
import { WIDGET_REGISTRY, createWidget, getCategories, getWidgetsByCategory } from './widgets/registry'
import { WidgetType } from './types'
import { SymbolSelector } from './SymbolSelector'

export function WidgetToolbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  // Use proper selectors for reactive subscriptions
  const widgets = useDashboardStore(state => state.widgets)
  const addWidget = useDashboardStore(state => state.addWidget)
  const clearWidgets = useDashboardStore(state => state.clearWidgets)
  
  const categories = ['all', ...getCategories()]

  const handleAddWidget = (type: WidgetType) => {
    const widget = createWidget(type)
    addWidget(widget)
    setIsOpen(false)
  }

  const handleSaveLayout = () => {
    // Layout is auto-saved via zustand persist middleware
    alert('Layout saved successfully!')
  }

  const handleClearAll = () => {
    if (confirm('Are you sure you want to remove all widgets?')) {
      clearWidgets()
    }
  }

  const filteredWidgets = selectedCategory === 'all'
    ? Object.values(WIDGET_REGISTRY)
    : getWidgetsByCategory(selectedCategory)

  return (
    <div className="w-full px-4 py-2.5">
      <div className="flex items-center justify-between">
        {/* Left: Symbol Selector & Add Widget */}
        <div className="flex items-center space-x-3">
          {/* Symbol Selector */}
          <SymbolSelector />
          
          {/* Add Widget Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Widget</span>
            </button>

            {/* Dropdown Menu - Compact */}
            {isOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                {/* Category Tabs */}
                <div className="flex border-b border-gray-700 px-2 pt-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-1 text-xs font-medium rounded-t capitalize transition-colors ${
                        selectedCategory === cat
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Widget List - Compact */}
                <div className="max-h-64 overflow-y-auto p-2">
                  {filteredWidgets.map((widget) => (
                    <button
                      key={widget.id}
                      onClick={() => handleAddWidget(widget.id)}
                      className="w-full flex items-center space-x-2 px-2 py-2 hover:bg-gray-700 rounded transition-colors text-left group"
                    >
                      <span className="text-lg">{widget.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-white group-hover:text-blue-400 block">
                          {widget.name}
                        </span>
                        <p className="text-[10px] text-gray-500 truncate">
                          {widget.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Click outside to close */}
            {isOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
            )}
          </div>

          {/* Widget Count */}
          <div className="text-xs text-gray-500">
            <span className="font-semibold text-white">{widgets.length}</span> widgets
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {/* Save Layout Button */}
          <button
            onClick={handleSaveLayout}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>Save Layout</span>
          </button>

          {/* Clear All Button */}
          {widgets.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-xs"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
