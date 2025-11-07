'use client'

import { useState, useEffect } from 'react'

export function MarketClock() {
  const [timeInfo, setTimeInfo] = useState<{
    isOpen: boolean
    countdown: string
    status: string
  }>({
    isOpen: false,
    countdown: '--:--:--',
    status: 'Calculating...'
  })

  useEffect(() => {
    const calculateMarketStatus = () => {
      const now = new Date()
      
      // Convert to EST/EDT (New York time)
      const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const dayOfWeek = nyTime.getDay() // 0 = Sunday, 6 = Saturday
      
      // Market is closed on weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const nextMonday = new Date(nyTime)
        nextMonday.setDate(nyTime.getDate() + ((1 + 7 - dayOfWeek) % 7 || 7))
        nextMonday.setHours(9, 30, 0, 0)
        
        const diff = nextMonday.getTime() - nyTime.getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        
        return {
          isOpen: false,
          countdown: `${days}d ${hours}h ${minutes}m`,
          status: 'Weekend - Opens Monday'
        }
      }
      
      const hours = nyTime.getHours()
      const minutes = nyTime.getMinutes()
      const seconds = nyTime.getSeconds()
      
      // Market hours: 9:30 AM - 4:00 PM EST
      const marketOpen = 9 * 60 + 30 // 9:30 AM in minutes
      const marketClose = 16 * 60 // 4:00 PM in minutes
      const currentMinutes = hours * 60 + minutes
      
      // Before market open
      if (currentMinutes < marketOpen) {
        const diff = (marketOpen - currentMinutes) * 60 - seconds
        const h = Math.floor(diff / 3600)
        const m = Math.floor((diff % 3600) / 60)
        const s = diff % 60
        
        return {
          isOpen: false,
          countdown: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
          status: 'Opens in'
        }
      }
      
      // During market hours
      if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
        const diff = (marketClose - currentMinutes) * 60 - seconds
        const h = Math.floor(diff / 3600)
        const m = Math.floor((diff % 3600) / 60)
        const s = diff % 60
        
        return {
          isOpen: true,
          countdown: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
          status: 'Closes in'
        }
      }
      
      // After market close - calculate time until next day's open
      const tomorrow = new Date(nyTime)
      tomorrow.setDate(nyTime.getDate() + 1)
      tomorrow.setHours(9, 30, 0, 0)
      
      const diff = Math.floor((tomorrow.getTime() - nyTime.getTime()) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      
      return {
        isOpen: false,
        countdown: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
        status: 'Opens in'
      }
    }

    // Update immediately
    setTimeInfo(calculateMarketStatus())

    // Update every second
    const interval = setInterval(() => {
      setTimeInfo(calculateMarketStatus())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium border ${
      timeInfo.isOpen 
        ? 'bg-green-900/30 border-green-700 text-green-400' 
        : 'bg-gray-700 border-gray-600 text-gray-300'
    }`}>
      {timeInfo.isOpen ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-semibold">MARKET OPEN</span>
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-500"></span>
          </span>
          <span className="text-xs font-semibold">MARKET CLOSED</span>
        </>
      )}
      <span className="text-gray-400 text-xs">•</span>
      <div className="flex flex-col">
        <span className="text-xs text-gray-400">{timeInfo.status}</span>
        <span className="text-sm font-mono font-bold">{timeInfo.countdown}</span>
      </div>
    </div>
  )
}
