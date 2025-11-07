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

    // Use dedicated endpoint to get ALL expiry dates (up to 1000 contracts)
    // This is more efficient and comprehensive than extracting from snapshot
    const expiries = await polygonClient.getOptionsExpiries(symbol.toUpperCase())

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
