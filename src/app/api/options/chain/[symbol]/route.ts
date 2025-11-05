import { NextRequest, NextResponse } from 'next/server'
import { polygonClient } from '@/lib/api/polygon'
import { auth } from '@/lib/auth'

/**
 * GET /api/options/chain/[symbol]
 * Get options chain with Greeks for a symbol
 * Query params: expiry, type (call/put), strikeRange
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { symbol } = await params
    const { searchParams } = new URL(request.url)
    
    const expiry = searchParams.get('expiry') || undefined
    const type = searchParams.get('type') as 'call' | 'put' | undefined
    const strikeRange = parseInt(searchParams.get('strikeRange') || '10')

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol parameter required' },
        { status: 400 }
      )
    }

    // Get stock price for ATM calculation
    let stockPrice = 0
    try {
      const quote = await polygonClient.getSnapshot(symbol.toUpperCase())
      stockPrice = quote.price
    } catch {
      const quote = await polygonClient.getQuote(symbol.toUpperCase())
      stockPrice = quote.price
    }

    // Get options chain
    const chain = await polygonClient.getOptionsChain(
      symbol.toUpperCase(),
      expiry,
      type
    )

    // Filter by strike range if stock price available
    let filteredChain = chain
    if (stockPrice > 0 && strikeRange) {
      const minStrike = stockPrice - (stockPrice * strikeRange / 100)
      const maxStrike = stockPrice + (stockPrice * strikeRange / 100)
      filteredChain = chain.filter(
        opt => opt.strike >= minStrike && opt.strike <= maxStrike
      )
    }

    // Calculate ATM strike
    const atmStrike = Math.round(stockPrice / 5) * 5

    return NextResponse.json({
      success: true,
      data: {
        chain: filteredChain,
        stockPrice,
        atmStrike,
        expiryDate: expiry || 'auto',
      },
      meta: {
        symbol: symbol.toUpperCase(),
        count: filteredChain.length,
        strikeRange,
      },
    })
  } catch (error: any) {
    console.error('Options chain API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch options chain' 
      },
      { status: 500 }
    )
  }
}
