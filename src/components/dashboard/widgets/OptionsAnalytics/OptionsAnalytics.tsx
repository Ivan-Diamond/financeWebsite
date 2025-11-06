'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { WidgetProps } from '../../types'
import { useDashboardStore } from '@/stores/dashboardStore'
import { OptionsChainData, OptionContract, MiniGraphData, IntradayDataPoint } from './types'
import ExpirySelector from './ExpirySelector'
import StrikeOverview from './StrikeOverview'
import BidAskTable from './BidAskTable'
import LiveChartSection from './LiveChartSection'

export default function OptionsAnalytics({ id, config, onConfigChange }: WidgetProps) {
  const activeSymbol = useDashboardStore(state => state.activeSymbol)
  
  // State
  const [expiries, setExpiries] = useState<string[]>([])
  const [selectedExpiry, setSelectedExpiry] = useState<string | undefined>(config.expiry)
  const [optionsData, setOptionsData] = useState<OptionsChainData | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [miniGraphData, setMiniGraphData] = useState<Map<string, MiniGraphData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Configuration
  const strikeCount = config.strikeCount || 5
  const showMiniGraphs = config.showMiniGraphs !== false
  const chartInterval = config.interval || '1m'

  // Fetch available expiries
  const fetchExpiries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/options/expiries/${activeSymbol}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch expiries')
      }
      
      const result = await response.json()
      
      if (!result.success || !result.data) {
        throw new Error('Invalid API response')
      }
      
      const expiriesList = result.data || []
      setExpiries(expiriesList)
      
      // Auto-select first expiry if none selected
      if (!selectedExpiry && expiriesList.length > 0) {
        setSelectedExpiry(expiriesList[0])
      } else if (expiriesList.length === 0) {
        setError('No options available for this symbol')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Error fetching expiries:', err)
      setError(err.message || 'Failed to load expiration dates')
      setLoading(false)
    }
  }, [activeSymbol, selectedExpiry])

  // Fetch options chain data
  const fetchOptionsChain = useCallback(async () => {
    if (!selectedExpiry) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/options/chain/${activeSymbol}?expiry=${selectedExpiry}`
      )
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch options chain')
      }
      
      const result = await response.json()
      
      // Handle API response format
      if (!result.success) {
        throw new Error(result.error || 'API returned unsuccessful response')
      }
      
      if (!result.data) {
        throw new Error('No options data available for this symbol/expiry')
      }
      
      const apiData = result.data
      const chain = apiData.chain || []
      
      // Separate calls and puts from the chain
      const calls = chain.filter((opt: any) => opt.type === 'call').map((opt: any) => ({
        strike: opt.strike,
        contractId: opt.contractId || `${opt.type}-${opt.strike}`,
        bid: opt.bid || 0,
        ask: opt.ask || 0,
        last: opt.last || 0,
        volume: opt.volume || 0,
        openInterest: opt.openInterest || 0,
        impliedVolatility: opt.impliedVolatility || 0,
        delta: opt.delta,
        gamma: opt.gamma,
        theta: opt.theta,
        vega: opt.vega,
      }))
      
      const puts = chain.filter((opt: any) => opt.type === 'put').map((opt: any) => ({
        strike: opt.strike,
        contractId: opt.contractId || `${opt.type}-${opt.strike}`,
        bid: opt.bid || 0,
        ask: opt.ask || 0,
        last: opt.last || 0,
        volume: opt.volume || 0,
        openInterest: opt.openInterest || 0,
        impliedVolatility: opt.impliedVolatility || 0,
        delta: opt.delta,
        gamma: opt.gamma,
        theta: opt.theta,
        vega: opt.vega,
      }))
      
      // Transform data to match our interface
      const chainData: OptionsChainData = {
        calls,
        puts,
        underlyingPrice: apiData.stockPrice || 0,
        expiry: selectedExpiry,
      }

      setOptionsData(chainData)
      
      // Generate mini-graph data
      if (showMiniGraphs) {
        generateMiniGraphData([...calls, ...puts])
      }
    } catch (err: any) {
      console.error('Error fetching options chain:', err)
      setError(err.message || 'Failed to load options data')
    } finally {
      setLoading(false)
    }
  }, [activeSymbol, selectedExpiry])

  // Fetch chart data for the underlying
  const fetchChartData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/market/historical/${activeSymbol}?timespan=${chartInterval}&limit=100`
      )
      
      if (!response.ok) throw new Error('Failed to fetch chart data')
      
      const result = await response.json()
      
      if (result.success && result.data) {
        setChartData(result.data)
      } else {
        setChartData([])
      }
    } catch (err) {
      console.error('Error fetching chart data:', err)
      setChartData([])
    }
  }, [activeSymbol, chartInterval])

  // Generate simulated mini-graph data
  // In production, this would fetch real intraday data for each contract
  const generateMiniGraphData = useCallback((contracts: OptionContract[]) => {
    const newMiniGraphData = new Map<string, MiniGraphData>()

    contracts.forEach(contract => {
      // Generate 30 random data points (simulated intraday data)
      const dataPoints: IntradayDataPoint[] = []
      const now = Date.now()
      const baseValue = contract.last || 1

      for (let i = 0; i < 30; i++) {
        const time = now - (29 - i) * 60 * 1000 // 1 minute intervals
        const randomWalk = (Math.random() - 0.5) * 0.1
        const value = baseValue * (1 + randomWalk * (i / 30))
        
        dataPoints.push({ time, value: Math.max(0.01, value) })
      }

      const firstValue = dataPoints[0].value
      const lastValue = dataPoints[dataPoints.length - 1].value
      const change = lastValue - firstValue
      const changePercent = (change / firstValue) * 100

      newMiniGraphData.set(contract.contractId, {
        contractId: contract.contractId,
        data: dataPoints,
        change,
        changePercent,
      })
    })

    setMiniGraphData(newMiniGraphData)
  }, [])

  // Filter strikes to ATM +/- strikeCount
  const filterStrikes = useCallback((
    contracts: OptionContract[],
    underlyingPrice: number,
    count: number
  ): OptionContract[] => {
    if (!contracts || contracts.length === 0) return []

    // Sort by strike price
    const sorted = [...contracts].sort((a, b) => a.strike - b.strike)

    // Find ATM strike (closest to underlying price)
    let atmIndex = 0
    let minDiff = Math.abs(sorted[0].strike - underlyingPrice)

    sorted.forEach((contract, i) => {
      const diff = Math.abs(contract.strike - underlyingPrice)
      if (diff < minDiff) {
        minDiff = diff
        atmIndex = i
      }
    })

    // Get strikes around ATM
    const startIndex = Math.max(0, atmIndex - count)
    const endIndex = Math.min(sorted.length, atmIndex + count + 1)

    return sorted.slice(startIndex, endIndex)
  }, [])

  // Effect: Load expiries on mount or symbol change
  useEffect(() => {
    fetchExpiries()
  }, [fetchExpiries])

  // Effect: Load options chain when expiry is selected
  useEffect(() => {
    if (selectedExpiry) {
      fetchOptionsChain()
      fetchChartData()
    }
  }, [selectedExpiry, fetchOptionsChain, fetchChartData])

  // Effect: Generate mini-graph data when options data changes
  useEffect(() => {
    if (optionsData && showMiniGraphs) {
      const allContracts = [...optionsData.calls, ...optionsData.puts]
      generateMiniGraphData(allContracts)
    }
  }, [optionsData, showMiniGraphs, generateMiniGraphData])

  // Effect: Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedExpiry) {
        fetchOptionsChain()
        fetchChartData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [selectedExpiry, fetchOptionsChain, fetchChartData])

  // Handle expiry change
  const handleExpiryChange = (expiry: string) => {
    setSelectedExpiry(expiry)
    onConfigChange({ ...config, expiry })
  }

  // Filter contracts for display
  const filteredCalls = optionsData 
    ? filterStrikes(optionsData.calls, optionsData.underlyingPrice, strikeCount)
    : []
  
  const filteredPuts = optionsData
    ? filterStrikes(optionsData.puts, optionsData.underlyingPrice, strikeCount)
    : []

  // Render loading state
  if (loading && !optionsData) {
    return (
      <div className="options-analytics-container h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-sm">Loading options data...</div>
        </div>
      </div>
    )
  }

  // Render error state
  if (error && !optionsData) {
    return (
      <div className="options-analytics-container h-full flex items-center justify-center">
        <div className="text-center text-red-400">
          <div className="text-3xl mb-2">⚠️</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="options-analytics-container h-full overflow-hidden p-2 flex flex-col">
      {/* Header with Expiry Selector */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-700">
        <div>
          <h3 className="text-sm font-bold text-gray-100">Options Analytics - {activeSymbol}</h3>
          {optionsData && (
            <p className="text-xs text-gray-500">
              Underlying: ${optionsData.underlyingPrice.toFixed(2)}
            </p>
          )}
        </div>
        
        <ExpirySelector
          expiries={expiries}
          selectedExpiry={selectedExpiry}
          onExpiryChange={handleExpiryChange}
          loading={!selectedExpiry && loading}
        />
      </div>

      {/* 5 Column Layout */}
      <div className="flex-1 grid grid-cols-5 gap-2 overflow-hidden">
        {/* Column 1: Calls Overview */}
        <div className="flex flex-col overflow-hidden">
          <StrikeOverview
            title="📈 Calls"
            contracts={filteredCalls}
            miniGraphData={miniGraphData}
            type="call"
            showMiniGraphs={showMiniGraphs}
          />
        </div>

        {/* Column 2: Call Bids/Asks */}
        <div className="flex flex-col overflow-hidden">
          <BidAskTable
            title="Call B/A"
            contracts={filteredCalls}
            type="call"
          />
        </div>

        {/* Column 3: Live Chart */}
        <div className="flex flex-col overflow-hidden">
          <LiveChartSection
            symbol={activeSymbol}
            data={chartData}
            height={0}
          />
        </div>

        {/* Column 4: Put Bids/Asks */}
        <div className="flex flex-col overflow-hidden">
          <BidAskTable
            title="Put B/A"
            contracts={filteredPuts}
            type="put"
          />
        </div>

        {/* Column 5: Puts Overview */}
        <div className="flex flex-col overflow-hidden">
          <StrikeOverview
            title="📉 Puts"
            contracts={filteredPuts}
            miniGraphData={miniGraphData}
            type="put"
            showMiniGraphs={showMiniGraphs}
          />
        </div>
      </div>
    </div>
  )
}
