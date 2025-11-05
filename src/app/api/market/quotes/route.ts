import { NextRequest, NextResponse } from 'next/server'
import { polygonClient } from '@/lib/api/polygon'
import { auth } from '@/lib/auth'

/**
 * GET multiple quotes at once
 * Query param: symbols=AAPL,TSLA,NVDA
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')

    if (!symbolsParam) {
      return NextResponse.json(
        { success: false, error: 'symbols parameter required (comma-separated)' },
        { status: 400 }
      )
    }

    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)

    if (symbols.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one symbol required' },
        { status: 400 }
      )
    }

    // Limit to 10 symbols per request
    const limitedSymbols = symbols.slice(0, 10)

    // Fetch all quotes in parallel
    const quotesPromises = limitedSymbols.map(async (symbol) => {
      try {
        // Try snapshot first, fallback to previous day
        try {
          return await polygonClient.getSnapshot(symbol)
        } catch {
          return await polygonClient.getQuote(symbol)
        }
      } catch (error: any) {
        console.error(`Failed to fetch ${symbol}:`, error.message)
        return {
          symbol,
          error: error.message || 'Failed to fetch quote',
        }
      }
    })

    const quotes = await Promise.all(quotesPromises)

    return NextResponse.json({
      success: true,
      data: quotes,
      count: quotes.length,
    })
  } catch (error: any) {
    console.error('Multi-quote API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch quotes' 
      },
      { status: 500 }
    )
  }
}
