#!/usr/bin/env node

/**
 * Standalone WebSocket Server for Finance Dashboard
 * Runs on port 3001 to avoid Next.js limitations
 * 
 * This server acts as a proxy between browser clients and Massive.com WebSocket
 */

const { WebSocketServer, WebSocket } = require('ws')
const http = require('http')
const { randomBytes } = require('crypto')
const { config } = require('dotenv')

// Load environment variables
config()

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('WebSocket server is running')
})

// Create WebSocket server
const wss = new WebSocketServer({ server })

const clients = new Map()
let stockWs = null
let optionsWs = null
const subscribedStocks = new Set()
const subscribedOptions = new Set()

console.log('🚀 Standalone WebSocket Server starting...')

// Connect to Massive.com WebSockets
function connectToMassive() {
  const apiKey = process.env.POLYGON_API_KEY
  
  if (!apiKey) {
    console.error('❌ POLYGON_API_KEY not found in environment')
    return
  }
  
  // Connect to stocks WebSocket
  console.log('🔌 Connecting to Massive.com Stocks WebSocket...')
  stockWs = new WebSocket('wss://socket.massive.com/stocks')
  
  stockWs.on('open', () => {
    console.log('✅ Connected to Stocks WebSocket')
    stockWs.send(JSON.stringify({ action: 'auth', params: apiKey }))
  })
  
  stockWs.on('message', (data) => {
    try {
      const messages = JSON.parse(data.toString())
      if (!Array.isArray(messages)) return
      
      messages.forEach(msg => {
        if (msg.ev === 'A') { // Aggregate (second bars)
          broadcastToClients({
            type: 'quote',
            data: {
              symbol: msg.sym,
              price: msg.c,
              open: msg.o,
              high: msg.h,
              low: msg.l,
              volume: msg.v,
              change: msg.c - msg.o,
              changePercent: ((msg.c - msg.o) / msg.o) * 100,
              timestamp: msg.e || Date.now(),
            }
          })
        }
      })
    } catch (error) {
      console.error('Error parsing stock message:', error)
    }
  })
  
  stockWs.on('error', (error) => {
    console.error('❌ Stock WebSocket error:', error.message)
  })
  
  stockWs.on('close', () => {
    console.log('❌ Stock WebSocket closed, reconnecting in 5s...')
    setTimeout(connectToMassive, 5000)
  })
  
  // Connect to options WebSocket
  console.log('🔌 Connecting to Massive.com Options WebSocket...')
  optionsWs = new WebSocket('wss://socket.massive.com/options')
  
  optionsWs.on('open', () => {
    console.log('✅ Connected to Options WebSocket')
    optionsWs.send(JSON.stringify({ action: 'auth', params: apiKey }))
  })
  
  optionsWs.on('message', (data) => {
    try {
      const messages = JSON.parse(data.toString())
      if (!Array.isArray(messages)) return
      
      messages.forEach(msg => {
        if (msg.ev === 'A') { // Aggregate
          broadcastToClients({
            type: 'option_update',
            data: {
              contractId: msg.sym,
              price: msg.c,
              open: msg.o,
              high: msg.h,
              low: msg.l,
              volume: msg.v,
              change: msg.c - msg.o,
              changePercent: ((msg.c - msg.o) / msg.o) * 100,
              timestamp: msg.e || Date.now(),
            }
          })
        }
      })
    } catch (error) {
      console.error('Error parsing option message:', error)
    }
  })
  
  optionsWs.on('error', (error) => {
    console.error('❌ Options WebSocket error:', error.message)
  })
  
  optionsWs.on('close', () => {
    console.log('❌ Options WebSocket closed, reconnecting in 5s...')
    setTimeout(() => {
      optionsWs = null
      connectToMassive()
    }, 5000)
  })
}

// Broadcast message to all connected clients
function broadcastToClients(message) {
  const payload = JSON.stringify(message)
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload)
    }
  })
}

// Subscribe to symbols on Massive.com
function subscribeToStocks(symbols) {
  if (!stockWs || stockWs.readyState !== WebSocket.OPEN) return
  
  const newSymbols = symbols.filter(s => !subscribedStocks.has(s))
  if (newSymbols.length === 0) return
  
  newSymbols.forEach(s => subscribedStocks.add(s))
  
  stockWs.send(JSON.stringify({
    action: 'subscribe',
    params: `A.${newSymbols.join(',A.')}`
  }))
  
  console.log(`📊 Subscribed to stocks:`, newSymbols)
}

function subscribeToOptions(contractIds) {
  if (!optionsWs || optionsWs.readyState !== WebSocket.OPEN) return
  
  const newIds = contractIds.filter(id => !subscribedOptions.has(id))
  if (newIds.length === 0) return
  
  newIds.forEach(id => subscribedOptions.add(id))
  
  optionsWs.send(JSON.stringify({
    action: 'subscribe',
    params: `A.${newIds.join(',A.')}`
  }))
  
  console.log(`📡 Subscribed to options:`, newIds.length, 'contracts')
}

connectToMassive()

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
          subscribeToStocks(message.symbols || [])
          break
          
        case 'unsubscribe':
          message.symbols?.forEach(symbol => client.stocks.delete(symbol))
          break
          
        case 'subscribe_options':
          message.contractIds?.forEach(id => client.options.add(id))
          subscribeToOptions(message.contractIds || [])
          break
          
        case 'unsubscribe_options':
          message.contractIds?.forEach(id => client.options.delete(id))
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
