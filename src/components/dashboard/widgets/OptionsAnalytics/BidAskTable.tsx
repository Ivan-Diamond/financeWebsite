import React from 'react'
import { OptionContract } from './types'

interface BidAskTableProps {
  title: string
  contracts: OptionContract[]
  type: 'call' | 'put'
}

export default function BidAskTable({ title, contracts, type }: BidAskTableProps) {
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
      
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="border-b border-gray-700">
              <th className="text-left py-1.5 px-2 font-semibold text-gray-300">Strike</th>
              <th className="text-right py-1.5 px-1 font-semibold text-gray-300">Bid</th>
              <th className="text-right py-1.5 px-1 font-semibold text-gray-300">Ask</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr 
                key={contract.contractId} 
                className="border-b border-gray-800/50 hover:bg-gray-700/30"
              >
                <td className="py-1.5 px-2 font-mono font-bold text-gray-100">
                  ${contract.strike.toFixed(2)}
                </td>
                <td className="text-right py-1.5 px-1 font-mono text-green-400">
                  {contract.bid.toFixed(2)}
                </td>
                <td className="text-right py-1.5 px-1 font-mono text-red-400">
                  {contract.ask.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
