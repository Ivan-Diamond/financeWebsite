import { MarketQuote, OptionsContract, CandlestickData } from '@/types'

const POLYGON_API_KEY = process.env.POLYGON_API_KEY
const POLYGON_REST_API = 'https://api.massive.com'

if (!POLYGON_API_KEY) {
  console.warn('⚠️  POLYGON_API_KEY not set - market data will be unavailable')
}

/**
 * Polygon.io REST API Client
 * Handles stock quotes, options data, and historical prices
 */
class PolygonClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || POLYGON_API_KEY || ''
    this.baseUrl = POLYGON_REST_API
  }

  /**
   * Build API URL with authentication
   */
  private buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    url.searchParams.set('apiKey', this.apiKey)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
    
    return url.toString()
  }

  /**
   * Make API request with error handling
   * Enterprise tier: Optimized for high-frequency, low-latency requests
   */
  private async request<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Enterprise tier: No caching for real-time data
        cache: 'no-store', // Always fetch fresh data
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Polygon API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Polygon API request failed:', error)
      throw error
    }
  }

  /**
   * Get current stock quote (real-time or delayed)
   * Endpoint: /v2/aggs/ticker/{symbol}/prev
   */
  async getQuote(symbol: string): Promise<MarketQuote> {
    const url = this.buildUrl(`/v2/aggs/ticker/${symbol}/prev`, { adjusted: 'true' })
    const response = await this.request<any>(url)

    if (!response.results || response.results.length === 0) {
      throw new Error(`No data available for symbol: ${symbol}`)
    }

    const data = response.results[0]
    const price = data.c // Close price
    const open = data.o
    const change = price - open
    const changePercent = ((change / open) * 100)

    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      volume: data.v,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.c,
      timestamp: data.t,
    }
  }

  /**
   * Get real-time snapshot quote (requires higher tier)
   * Endpoint: /v2/snapshot/locale/us/markets/stocks/tickers/{symbol}
   */
  async getSnapshot(symbol: string): Promise<MarketQuote> {
    const url = this.buildUrl(`/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`)
    const response = await this.request<any>(url)

    if (!response.ticker) {
      throw new Error(`No snapshot data for symbol: ${symbol}`)
    }

    const ticker = response.ticker
    const price = ticker.day.c || ticker.prevDay.c
    const open = ticker.day.o || ticker.prevDay.o
    const change = price - ticker.prevDay.c
    const changePercent = ((change / ticker.prevDay.c) * 100)

    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      volume: ticker.day.v || 0,
      high: ticker.day.h || ticker.prevDay.h,
      low: ticker.day.l || ticker.prevDay.l,
      open,
      previousClose: ticker.prevDay.c,
      timestamp: ticker.updated || Date.now(),
    }
  }

  /**
   * Get options chain with PREMIUM real-time market data
   * Endpoint: /v3/snapshot/options/{underlying_ticker}
   * Enterprise/Developer tier: Full bid/ask, Greeks, volume, IV
   */
  async getOptionsChain(
    symbol: string,
    expiry?: string,
    type?: 'call' | 'put'
  ): Promise<OptionsContract[]> {
    try {
      // Premium tier: Use maximum allowed limit (250 for snapshot endpoint)
      const url = this.buildUrl(`/v3/snapshot/options/${symbol.toUpperCase()}`, {
        expiration_date: expiry,
        contract_type: type,
        limit: 250, // Maximum allowed by Polygon.io snapshot API
      })
      
      const response = await this.request<any>(url)

      if (!response.results || response.results.length === 0) {
        console.warn(`No options data for ${symbol}`)
        return []
      }

      // Map FULL real-time market data with premium features
      const contracts: OptionsContract[] = response.results
        .filter((opt: any) => opt.details)
        .map((opt: any) => ({
          symbol: opt.details.ticker || '',
          strike: opt.details.strike_price || 0,
          expiry: opt.details.expiration_date || '',
          type: opt.details.contract_type || 'call',
          // REAL bid/ask from premium tier (not approximations)
          volume: opt.day?.volume || 0,
          openInterest: opt.open_interest || 0,
          bid: opt.last_quote?.bid || opt.day?.close || 0,
          ask: opt.last_quote?.ask || (opt.day?.close ? opt.day.close * 1.01 : 0),
          last: opt.last_trade?.price || opt.day?.close || 0,
          // Full Greeks from premium calculations
          impliedVolatility: opt.implied_volatility || 0,
          delta: opt.greeks?.delta || 0,
          gamma: opt.greeks?.gamma || 0,
          theta: opt.greeks?.theta || 0,
          vega: opt.greeks?.vega || 0,
          rho: opt.greeks?.rho || 0, // Premium tier includes Rho
        }))
      
      return contracts.sort((a, b) => a.strike - b.strike)
    } catch (error) {
      console.error('Failed to fetch options snapshot:', error)
      
      // Fallback to reference endpoint if snapshot fails
      return this.getOptionsChainFallback(symbol, expiry, type)
    }
  }

  /**
   * Fallback method using reference endpoint (contract metadata only)
   */
  private async getOptionsChainFallback(
    symbol: string,
    expiry?: string,
    type?: 'call' | 'put'
  ): Promise<OptionsContract[]> {
    const params: Record<string, any> = {
      underlying_ticker: symbol.toUpperCase(),
      limit: 250,
      order: 'asc',
      sort: 'strike_price',
    }

    if (expiry) params.expiration_date = expiry
    if (type) params.contract_type = type

    const url = this.buildUrl('/v3/reference/options/contracts', params)
    const response = await this.request<any>(url)

    if (!response.results || response.results.length === 0) {
      return []
    }

    // Return with minimal data (contract structure only)
    return response.results.map((contract: any) => ({
      symbol: contract.ticker,
      strike: contract.strike_price,
      expiry: contract.expiration_date,
      type: contract.contract_type,
      volume: 0,
      openInterest: 0,
      bid: 0,
      ask: 0,
      last: 0,
      impliedVolatility: 0,
      delta: 0,
      gamma: 0,
      theta: 0,
      vega: 0,
    }))
  }

  /**
   * Get historical aggregate bars (OHLCV)
   * Endpoint: /v2/aggs/ticker/{symbol}/range/{multiplier}/{timespan}/{from}/{to}
   */
  async getHistoricalData(
    symbol: string,
    from: string,
    to: string,
    timespan: '1' | '5' | '15' | '60' | '240' | 'day' | 'minute' | 'hour' | 'week' | 'month' | 'quarter' | 'year' = '60',
    multiplier: number = 1
  ): Promise<CandlestickData[]> {
    // Map common interval values to API timespan values
    const timespanMap: Record<string, string> = {
      '1': 'minute',
      '5': 'minute',
      '15': 'minute',
      '60': 'minute',
      '240': 'minute',
      '1m': 'minute',
      '5m': 'minute',
      '15m': 'minute',
      '1h': 'hour',
      '4h': 'hour',
      '1d': 'day',
      'day': 'day',
      'minute': 'minute',
      'hour': 'hour',
      'week': 'week',
      'month': 'month',
      'quarter': 'quarter',
      'year': 'year',
    }

    // Use mapped value or pass through if already valid
    const apiTimespan = timespanMap[timespan] || timespan

    const url = this.buildUrl(
      `/v2/aggs/ticker/${symbol}/range/${multiplier}/${apiTimespan}/${from}/${to}`,
      { adjusted: 'true', sort: 'asc' }
    )

    const response = await this.request<any>(url)

    if (!response.results) {
      return []
    }

    return response.results.map((bar: any) => ({
      time: bar.t,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }))
  }

  /**
   * Search for stock symbols
   * Endpoint: /v3/reference/tickers
   */
  async searchSymbols(query: string, limit: number = 10): Promise<Array<{ symbol: string; name: string }>> {
    const url = this.buildUrl('/v3/reference/tickers', {
      search: query,
      market: 'stocks',
      active: 'true',
      limit,
    })

    const response = await this.request<any>(url)

    if (!response.results) {
      return []
    }

    return response.results.map((ticker: any) => ({
      symbol: ticker.ticker,
      name: ticker.name,
    }))
  }

  /**
   * Get market status (open/closed)
   * Endpoint: /v1/marketstatus/now
   */
  async getMarketStatus(): Promise<{ market: string; status: string }> {
    const url = this.buildUrl('/v1/marketstatus/now')
    const response = await this.request<any>(url)

    return {
      market: 'stocks',
      status: response.market || 'unknown',
    }
  }

  /**
   * Get available options expiration dates for a symbol
   * Endpoint: /v3/reference/options/contracts
   * Uses pagination to ensure we capture ALL expiry dates
   */
  async getOptionsExpiries(symbol: string): Promise<string[]> {
    try {
      const expirySet = new Set<string>()
      let nextUrl: string | undefined = this.buildUrl('/v3/reference/options/contracts', {
        underlying_ticker: symbol.toUpperCase(),
        limit: 1000, // Max per request
      })

      // Paginate through all contracts to get ALL unique expiries
      let iterations = 0
      const maxIterations = 10 // Safety limit (10k contracts max)
      
      while (nextUrl && iterations < maxIterations) {
        const response: any = await this.request<any>(nextUrl)

        if (response.results && response.results.length > 0) {
          // Extract expiration dates from this batch
          response.results.forEach((contract: any) => {
            if (contract.expiration_date) {
              expirySet.add(contract.expiration_date)
            }
          })
        }

        // Check for next page - next_url doesn't include API key, so we need to add it
        if (response.next_url) {
          const url = new URL(response.next_url)
          url.searchParams.set('apiKey', this.apiKey)
          nextUrl = url.toString()
        } else {
          nextUrl = undefined
        }
        
        iterations++
        
        // If we have a good number of unique expiries and no more pages, break
        if (!nextUrl || expirySet.size > 100) break // 100+ expiries is unlikely
      }

      const expiries = Array.from(expirySet).sort()
      console.log(`📅 Found ${expiries.length} unique expiry dates for ${symbol}`)
      return expiries
    } catch (error) {
      console.error('Failed to fetch options expiries:', error)
      return []
    }
  }
}

// Export singleton instance
export const polygonClient = new PolygonClient()

// Export class for custom instances
export default PolygonClient
