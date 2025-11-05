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
    const { searchParams } = new URL(request.url)
    
    const from = searchParams.get('from') || getDefaultFrom()
    const to = searchParams.get('to') || getDefaultTo()
    const timespan = (searchParams.get('timespan') || '60') as any
    const multiplier = parseInt(searchParams.get('multiplier') || '1')

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol parameter required' },
        { status: 400 }
      )
    }

    const data = await polygonClient.getHistoricalData(
      symbol.toUpperCase(),
      from,
      to,
      timespan,
      multiplier
    )

    return NextResponse.json({
      success: true,
      data,
      meta: {
        symbol: symbol.toUpperCase(),
        from,
        to,
        timespan,
        count: data.length,
      },
    })
  } catch (error: any) {
    console.error('Historical data API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch historical data' 
      },
      { status: 500 }
    )
  }
}

// Helper to get default date range (last 30 days)
function getDefaultFrom(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}

function getDefaultTo(): string {
  return new Date().toISOString().split('T')[0]
}
