#!/usr/bin/env node

/**
 * Standalone WebSocket Server for Finance Dashboard
 * Runs on port 3001 to avoid Next.js limitations
 */

const { WebSocketServer } = require('ws')
const http = require('http')
const { randomBytes } = require('crypto')

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('WebSocket server is running')
})

// Create WebSocket server
const wss = new WebSocketServer({ server })

const clients = new Map()

console.log('🚀 Standalone WebSocket Server starting...')

wss.on('connection', (ws, req) => {
  const clientId = randomBytes(16).toString('hex')
  clients.set(clientId, {
    ws,
    stocks: new Set(),
    options: new Set()
  })
  
  console.log(`✅ Client ${clientId} connected (Total: ${clients.size})`)
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      const client = clients.get(clientId)
      
      if (!client) return
      
      switch (message.type) {
        case 'subscribe':
          message.symbols?.forEach(symbol => client.stocks.add(symbol))
          console.log(`📊 Client ${clientId} subscribed to stocks:`, message.symbols)
          // Forward to backend WebSocket manager
          // TODO: Integrate with actual Massive.com WebSocket
          break
          
        case 'unsubscribe':
          message.symbols?.forEach(symbol => client.stocks.delete(symbol))
          console.log(`📊 Client ${clientId} unsubscribed from stocks:`, message.symbols)
          break
          
        case 'subscribe_options':
          message.contractIds?.forEach(id => client.options.add(id))
          console.log(`📡 Client ${clientId} subscribed to options:`, message.contractIds?.length, 'contracts')
          break
          
        case 'unsubscribe_options':
          message.contractIds?.forEach(id => client.options.delete(id))
          console.log(`📡 Client ${clientId} unsubscribed from options:`, message.contractIds?.length, 'contracts')
          break
      }
    } catch (error) {
      console.error('❌ Error handling message:', error)
    }
  })
  
  ws.on('close', () => {
    clients.delete(clientId)
    console.log(`❌ Client ${clientId} disconnected (Total: ${clients.size})`)
  })
  
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for client ${clientId}:`, error.message)
  })
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    message: 'Connected to WebSocket server'
  }))
})

// Start server
const PORT = process.env.WS_PORT || 3001
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WebSocket server listening on port ${PORT}`)
  console.log(`📡 Ready to accept connections`)
})

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, closing server...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT received, closing server...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})
