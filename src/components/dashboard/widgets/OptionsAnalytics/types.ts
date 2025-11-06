// Options Analytics Widget Types

export interface OptionContract {
  strike: number
  contractId: string
  bid: number
  ask: number
  last: number
  volume: number
  openInterest: number
  impliedVolatility: number
  delta?: number
  gamma?: number
  theta?: number
  vega?: number
}

export interface OptionsChainData {
  calls: OptionContract[]
  puts: OptionContract[]
  underlyingPrice: number
  expiry: string
}

export interface IntradayDataPoint {
  time: number
  value: number
}

export interface MiniGraphData {
  contractId: string
  data: IntradayDataPoint[]
  change: number
  changePercent: number
}
