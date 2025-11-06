import React from 'react'
import { formatDistanceToNow } from 'date-fns'

interface ExpirySelectorProps {
  expiries: string[]
  selectedExpiry: string | undefined
  onExpiryChange: (expiry: string) => void
  loading?: boolean
}

export default function ExpirySelector({ 
  expiries, 
  selectedExpiry, 
  onExpiryChange,
  loading 
}: ExpirySelectorProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-400">Expiry:</label>
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!expiries || expiries.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-400">Expiry:</label>
        <div className="text-xs text-gray-500">No expiries available</div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="expiry-select" className="text-xs font-semibold text-gray-400">
        Expiry:
      </label>
      <select
        id="expiry-select"
        value={selectedExpiry || ''}
        onChange={(e) => onExpiryChange(e.target.value)}
        className="bg-gray-700 text-gray-100 text-xs px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {expiries.map((expiry) => {
          const expiryDate = new Date(expiry)
          const daysUntil = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          
          return (
            <option key={expiry} value={expiry}>
              {expiry} ({daysUntil}d)
            </option>
          )
        })}
      </select>
      
      {selectedExpiry && (
        <div className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(selectedExpiry), { addSuffix: true })}
        </div>
      )}
    </div>
  )
}
