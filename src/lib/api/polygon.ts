import { MarketQuote, OptionsContract, CandlestickData } from '@/types'

const POLYGON_API_KEY = process.env.POLYGON_API_KEY
const POLYGON_REST_API = 'https://api.polygon.io'

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
   */
  private async request<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 1 }, // Cache for 1 second
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
   * Get options chain for a symbol
   * Endpoint: /v3/reference/options/contracts
   */
  async getOptionsChain(
    symbol: string,
    expiry?: string,
    type?: 'call' | 'put'
  ): Promise<OptionsContract[]> {
    const params: Record<string, any> = {
      underlying_ticker: symbol.toUpperCase(),
      limit: 100,
    }

    if (expiry) params.expiration_date = expiry
    if (type) params.contract_type = type

    const url = this.buildUrl('/v3/reference/options/contracts', params)
    const response = await this.request<any>(url)

    if (!response.results) {
      return []
    }

    // Map to our format (Note: Greeks require separate endpoint or paid tier)
    return response.results.map((contract: any) => ({
      symbol: contract.ticker,
      strike: contract.strike_price,
      expiry: contract.expiration_date,
      type: contract.contract_type,
      volume: 0, // Requires market data
      openInterest: 0,
      bid: 0,
      ask: 0,
      last: 0,
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
    timespan: '1' | '5' | '15' | '60' | '240' | 'day' = '60',
    multiplier: number = 1
  ): Promise<CandlestickData[]> {
    const timespanMap: Record<string, string> = {
      '1': 'minute',
      '5': 'minute',
      '15': 'minute',
      '60': 'minute',
      '240': 'minute',
      'day': 'day',
    }

    const url = this.buildUrl(
      `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespanMap[timespan]}/${from}/${to}`,
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
}

// Export singleton instance
export const polygonClient = new PolygonClient()

// Export class for custom instances
export default PolygonClient
