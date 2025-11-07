'use client'

import { useState, useEffect } from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'

interface SavedLayout {
  id: string
  name: string
  isDefault: boolean
  widgets: any[]
  createdAt: string
  updatedAt: string
}

export function LayoutManager() {
  const [isOpen, setIsOpen] = useState(false)
  const [layouts, setLayouts] = useState<SavedLayout[]>([])
  const [loading, setLoading] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [layoutName, setLayoutName] = useState('')
  const [isDefaultLayout, setIsDefaultLayout] = useState(false)
  
  const widgets = useDashboardStore(state => state.widgets)
  const loadPreset = useDashboardStore(state => state.loadPreset)
  const clearWidgets = useDashboardStore(state => state.clearWidgets)

  // Fetch saved layouts
  const fetchLayouts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/layouts')
      const data = await response.json()
      if (data.layouts) {
        setLayouts(data.layouts)
      }
    } catch (error) {
      console.error('Failed to fetch layouts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchLayouts()
    }
  }, [isOpen])

  // Save current layout to database
  const handleSaveLayout = async () => {
    if (!layoutName.trim()) {
      alert('Please enter a layout name')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: layoutName,
          widgets: widgets,
          isDefault: isDefaultLayout,
        }),
      })

      if (response.ok) {
        alert(`Layout "${layoutName}" saved successfully!`)
        setLayoutName('')
        setIsDefaultLayout(false)
        setSaveDialogOpen(false)
        fetchLayouts() // Refresh list
      } else {
        const error = await response.json()
        alert(`Failed to save: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to save layout:', error)
      alert('Failed to save layout')
    } finally {
      setLoading(false)
    }
  }

  // Load a saved layout
  const handleLoadLayout = async (layoutId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/layouts/${layoutId}`)
      const data = await response.json()
      
      if (data.layout && data.layout.widgets) {
        // Convert database widgets to dashboard format
        const dashboardWidgets = data.layout.widgets.map((w: any) => ({
          id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: w.type,
          config: w.config,
          layout: {
            x: w.gridX,
            y: w.gridY,
            w: w.gridW,
            h: w.gridH,
          },
          createdAt: Date.now(),
        }))
        
        loadPreset(dashboardWidgets)
        alert(`Loaded layout: ${data.layout.name}`)
        setIsOpen(false)
      }
    } catch (error) {
      console.error('Failed to load layout:', error)
      alert('Failed to load layout')
    } finally {
      setLoading(false)
    }
  }

  // Delete a layout
  const handleDeleteLayout = async (layoutId: string, layoutName: string) => {
    if (!confirm(`Delete layout "${layoutName}"?`)) return

    setLoading(true)
    try {
      const response = await fetch(`/api/layouts/${layoutId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert(`Layout "${layoutName}" deleted`)
        fetchLayouts() // Refresh list
      } else {
        alert('Failed to delete layout')
      }
    } catch (error) {
      console.error('Failed to delete layout:', error)
      alert('Failed to delete layout')
    } finally {
      setLoading(false)
    }
  }

  // Set as default layout
  const handleSetDefault = async (layoutId: string) => {
    setLoading(true)
    try {
      // Get the layout first
      const getResponse = await fetch(`/api/layouts/${layoutId}`)
      const getData = await getResponse.json()
      
      if (!getData.layout) {
        alert('Layout not found')
        return
      }

      // Update with isDefault = true
      const response = await fetch(`/api/layouts/${layoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...getData.layout,
          isDefault: true,
        }),
      })

      if (response.ok) {
        alert('Default layout updated')
        fetchLayouts() // Refresh list
      }
    } catch (error) {
      console.error('Failed to set default:', error)
      alert('Failed to set default layout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Main Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>Layouts</span>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                <div className="text-sm font-semibold text-white">Saved Layouts</div>
                <button
                  onClick={() => setSaveDialogOpen(true)}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                >
                  + Save Current
                </button>
              </div>

              {/* Layouts List */}
              <div className="p-2">
                {loading ? (
                  <div className="text-center py-8 text-gray-400">Loading...</div>
                ) : layouts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="text-xs">No saved layouts yet</div>
                    <div className="text-xs text-gray-500 mt-1">Click "Save Current" to save your first layout</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {layouts.map((layout) => (
                      <div
                        key={layout.id}
                        className="p-3 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-white">
                                {layout.name}
                              </span>
                              {layout.isDefault && (
                                <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded">
                                  DEFAULT
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {layout.widgets.length} widgets • {new Date(layout.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-1 mt-2">
                          <button
                            onClick={() => handleLoadLayout(layout.id)}
                            disabled={loading}
                            className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded disabled:opacity-50"
                          >
                            Load
                          </button>
                          {!layout.isDefault && (
                            <button
                              onClick={() => handleSetDefault(layout.id)}
                              disabled={loading}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded disabled:opacity-50"
                              title="Set as default"
                            >
                              ⭐
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLayout(layout.id, layout.name)}
                            disabled={loading}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Click outside to close */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
          </>
        )}
      </div>

      {/* Save Dialog */}
      {saveDialogOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold text-white mb-4">Save Layout</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Layout Name</label>
                  <input
                    type="text"
                    value={layoutName}
                    onChange={(e) => setLayoutName(e.target.value)}
                    placeholder="e.g., My Trading Setup"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefaultLayout}
                    onChange={(e) => setIsDefaultLayout(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-300">
                    Set as default layout
                  </label>
                </div>

                <div className="text-xs text-gray-500">
                  Saving {widgets.length} widget{widgets.length !== 1 ? 's' : ''} with current positions
                </div>
              </div>

              <div className="flex space-x-2 mt-6">
                <button
                  onClick={handleSaveLayout}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Layout'}
                </button>
                <button
                  onClick={() => {
                    setSaveDialogOpen(false)
                    setLayoutName('')
                    setIsDefaultLayout(false)
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
