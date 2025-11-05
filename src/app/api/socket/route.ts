import { NextRequest } from 'next/server'
import { WebSocketServer, WebSocket } from 'ws'
import { wsManager } from '@/lib/socket/server'
import { ClientMessage, SubscribeMessage, UnsubscribeMessage } from '@/lib/socket/types'
import { randomBytes } from 'crypto'

// WebSocket server instance (singleton)
let wss: WebSocketServer | null = null

function generateClientId(): string {
  return randomBytes(16).toString('hex')
}

/**
 * GET handler - Upgrade HTTP to WebSocket
 */
export async function GET(req: NextRequest) {
  // Check if WebSocket upgrade is requested
  const upgradeHeader = req.headers.get('upgrade')
  
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket connection', { status: 426 })
  }

  // Initialize WebSocket server if not already created
  if (!wss) {
    wss = new WebSocketServer({ noServer: true })
    console.log('🚀 WebSocket Server initialized')
  }

  // Return a response that will be intercepted by Next.js for WebSocket upgrade
  return new Response('WebSocket endpoint ready', {
    status: 101,
    headers: {
      Upgrade: 'websocket',
      Connection: 'Upgrade',
    },
  })
}

/**
 * Handle WebSocket upgrade (called by Next.js internals)
 */
export function handleWebSocketUpgrade(req: any, socket: any, head: any) {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true })
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    handleWebSocketConnection(ws, req)
  })
}

/**
 * Handle WebSocket connection
 */
function handleWebSocketConnection(ws: WebSocket, req: any) {
  const clientId = generateClientId()
  
  // Register client with manager
  wsManager.addClient(clientId, ws)

  // Handle incoming messages from client
  ws.on('message', (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString())
      handleClientMessage(clientId, message, ws)
    } catch (error) {
      console.error('Failed to parse client message:', error)
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: Date.now(),
      }))
    }
  })

  // Handle client disconnect
  ws.on('close', () => {
    wsManager.removeClient(clientId)
  })

  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error)
  })

  // Send ping every 30 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping()
    } else {
      clearInterval(pingInterval)
    }
  }, 30000)
}

/**
 * Handle messages from client
 */
function handleClientMessage(clientId: string, message: ClientMessage, ws: WebSocket) {
  switch (message.type) {
    case 'subscribe': {
      const subscribeMsg = message as SubscribeMessage
      if (subscribeMsg.symbols && subscribeMsg.symbols.length > 0) {
        // Limit to 50 symbols per client
        const symbols = subscribeMsg.symbols.slice(0, 50)
        wsManager.subscribe(clientId, symbols)
      }
      break
    }

    case 'unsubscribe': {
      const unsubscribeMsg = message as UnsubscribeMessage
      if (unsubscribeMsg.symbols && unsubscribeMsg.symbols.length > 0) {
        wsManager.unsubscribe(clientId, unsubscribeMsg.symbols)
      }
      break
    }

    case 'ping': {
      // Respond to ping
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now(),
      }))
      break
    }

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${message.type}`,
        timestamp: Date.now(),
      }))
  }
}

// Export stats endpoint
export async function POST(req: NextRequest) {
  const stats = wsManager.getStats()
  return Response.json(stats)
}
