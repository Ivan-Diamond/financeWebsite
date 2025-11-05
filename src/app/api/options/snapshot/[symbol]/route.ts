import { NextRequest, NextResponse } from 'next/server'
import { polygonClient } from '@/lib/api/polygon'
import { auth } from '@/lib/auth'

/**
 * GET /api/options/snapshot/[symbol]
 * Get quick options summary for a symbol
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

    // Get options chain (limited)
    const chain = await polygonClient.getOptionsChain(symbol.toUpperCase())

    // Calculate summary stats
    const calls = chain.filter(opt => opt.type === 'call')
    const puts = chain.filter(opt => opt.type === 'put')
    
    const totalCallVolume = calls.reduce((sum, opt) => sum + opt.volume, 0)
    const totalPutVolume = puts.reduce((sum, opt) => sum + opt.volume, 0)
    const totalCallOI = calls.reduce((sum, opt) => sum + opt.openInterest, 0)
    const totalPutOI = puts.reduce((sum, opt) => sum + opt.openInterest, 0)
    
    const putCallRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 0

    return NextResponse.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        totalCallVolume,
        totalPutVolume,
        totalCallOI,
        totalPutOI,
        putCallRatio,
        totalContracts: chain.length,
      },
    })
  } catch (error: any) {
    console.error('Options snapshot API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch options snapshot' 
      },
      { status: 500 }
    )
  }
}
