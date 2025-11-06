import React from 'react'
import MiniGraph from './MiniGraph'
import { OptionContract, MiniGraphData } from './types'

interface StrikeOverviewProps {
  title: string
  contracts: OptionContract[]
  miniGraphData: Map<string, MiniGraphData>
  type: 'call' | 'put'
  showMiniGraphs?: boolean
}

export default function StrikeOverview({ 
  title, 
  contracts, 
  miniGraphData,
  type,
  showMiniGraphs = true 
}: StrikeOverviewProps) {
  if (!contracts || contracts.length === 0) {
    return (
      <div className="section">
        <div className="section-header text-sm font-semibold text-gray-200">
          {title}
        </div>
        <div className="text-xs text-gray-400 text-center py-4">
          No data available
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-800/30 rounded border border-gray-700">
      <div className="text-xs font-semibold text-gray-200 p-2 border-b border-gray-700">
        {title}
      </div>
      
      <div className="flex-1 overflow-y-auto p-1">
        {contracts.map((contract) => {
          const graphData = miniGraphData.get(contract.contractId)
          
          return (
            <div 
              key={contract.contractId}
              className="flex flex-col py-1.5 px-2 border-b border-gray-800/50 hover:bg-gray-700/30"
            >
              {/* Strike Price */}
              <div className="font-mono font-bold text-xs text-gray-100">
                ${contract.strike.toFixed(2)}
              </div>
              
              {/* Mini Graph */}
              {showMiniGraphs && graphData && graphData.data.length > 0 && (
                <div className="mt-1">
                  <MiniGraph 
                    data={graphData.data} 
                    width={100}
                    height={30}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
