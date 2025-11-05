import { NextRequest, NextResponse } from 'next/server'
import { polygonClient } from '@/lib/api/polygon'
import { auth } from '@/lib/auth'

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
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.length < 1) {
      return NextResponse.json(
        { success: false, error: 'Search query required (parameter: q)' },
        { status: 400 }
      )
    }

    const results = await polygonClient.searchSymbols(query, limit)

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        query,
        count: results.length,
      },
    })
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to search symbols' 
      },
      { status: 500 }
    )
  }
}
