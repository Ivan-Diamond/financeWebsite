'use client'

/**
 * WebSocket Provider
 * 
 * Initializes WebSocketManager on mount and keeps connection alive
 * This should be mounted once at the root level
 */

import { useEffect } from 'react'
import { wsManager } from '@/services/WebSocketManager'

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize and connect on mount
    console.log('🚀 Initializing WebSocketManager...')
    wsManager.connect()
    
    // No cleanup - keep connection alive for app lifetime
    // Connection will be maintained even if components unmount
  }, [])
  
  return <>{children}</>
}
