import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { polygonClient } from '@/lib/api/polygon'

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'SPY'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get available expiries
    const expiries = await polygonClient.getOptionsExpiries(symbol)
    
    if (!expiries || expiries.length === 0) {
      return NextResponse.json({ 
        flows: [],
        message: 'No options data available for this symbol'
      })
    }

    // Get options chain for nearest expiry
    const nearestExpiry = expiries[0]
    const chain = await polygonClient.getOptionsChain(symbol, nearestExpiry)
    
    if (!chain || chain.length === 0) {
      return NextResponse.json({ 
        flows: [],
        message: 'No options chain data available'
      })
    }

    // Use real market data from paid tier
    const flows = chain
      .filter(contract => contract.volume > 0) // Only contracts with actual volume
      .map((contract) => {
        const volume = contract.volume || 0
        const oi = contract.openInterest || 0
        
        return {
          symbol,
          strike: contract.strike,
          expiry: contract.expiry,
          type: contract.type,
          volume,
          openInterest: oi,
          lastPrice: contract.last,
          bid: contract.bid,
          ask: contract.ask,
          impliedVolatility: contract.impliedVolatility,
          delta: contract.delta,
          gamma: contract.gamma,
          theta: contract.theta,
          vega: contract.vega,
          timestamp: Date.now(),
          isUnusual: false,
          sentiment: 'neutral' as 'bullish' | 'bearish' | 'neutral',
        }
      })

    // Calculate average volume for unusual detection
    const volumes = flows.map(f => f.volume).filter(v => v > 0)
    const avgVolume = volumes.length > 0 
      ? volumes.reduce((a, b) => a + b, 0) / volumes.length 
      : 1
    const volumeThreshold = avgVolume * 2

    // Mark unusual activity and determine sentiment
    flows.forEach(flow => {
      flow.isUnusual = flow.volume > volumeThreshold
      flow.sentiment = determineSentiment(flow.type, flow.isUnusual, flow.volume, flow.openInterest)
    })

    // Sort by volume descending and limit
    const sortedFlows = flows
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit)

    const unusualCount = sortedFlows.filter(f => f.isUnusual).length

    return NextResponse.json({
      flows: sortedFlows,
      meta: {
        symbol,
        expiry: nearestExpiry,
        totalFlows: sortedFlows.length,
        unusualCount,
        avgVolume: Math.round(avgVolume),
        volumeThreshold: Math.round(volumeThreshold)
      }
    })
  } catch (error) {
    console.error('Options flow error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch options flow data' },
      { status: 500 }
    )
  }
}

function determineSentiment(
  type: string, 
  isUnusual: boolean, 
  volume: number, 
  openInterest: number
): 'bullish' | 'bearish' | 'neutral' {
  if (!isUnusual) return 'neutral'
  
  // Volume to OI ratio indicates new positions vs rolling
  const volumeToOI = openInterest > 0 ? volume / openInterest : 0
  
  // High volume relative to OI suggests new positions being opened
  if (volumeToOI > 0.3) {
    // Heavy call buying = bullish
    if (type === 'call') return 'bullish'
    // Heavy put buying = bearish
    if (type === 'put') return 'bearish'
  }
  
  return 'neutral'
}
