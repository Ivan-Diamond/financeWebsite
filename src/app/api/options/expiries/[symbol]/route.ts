import { NextRequest, NextResponse } from 'next/server'
import { polygonClient } from '@/lib/api/polygon'
import { auth } from '@/lib/auth'

/**
 * GET /api/options/expiries/[symbol]
 * Get available expiration dates for a symbol
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

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol parameter required' },
        { status: 400 }
      )
    }

    // Get options chain to extract expiry dates
    const chain = await polygonClient.getOptionsChain(symbol.toUpperCase())

    // Extract unique expiry dates
    const expirySet = new Set<string>()
    chain.forEach(opt => {
      if (opt.expiry) expirySet.add(opt.expiry)
    })

    const expiries = Array.from(expirySet).sort()

    return NextResponse.json({
      success: true,
      data: expiries,
      count: expiries.length,
    })
  } catch (error: any) {
    console.error('Options expiries API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch expiry dates' 
      },
      { status: 500 }
    )
  }
}
