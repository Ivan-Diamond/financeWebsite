import { NextRequest, NextResponse } from 'next/server'
import { polygonClient } from '@/lib/api/polygon'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    // Check authentication
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

    // Try snapshot first (real-time), fallback to previous day
    let quote
    try {
      quote = await polygonClient.getSnapshot(symbol.toUpperCase())
    } catch (error) {
      // Fallback to previous day data if snapshot fails
      console.log(`Snapshot failed for ${symbol}, using previous day data`)
      quote = await polygonClient.getQuote(symbol.toUpperCase())
    }

    return NextResponse.json({
      success: true,
      data: quote,
    })
  } catch (error: any) {
    console.error('Quote API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch quote data' 
      },
      { status: 500 }
    )
  }
}
