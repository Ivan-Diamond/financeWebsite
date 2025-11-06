import React, { useEffect, useRef } from 'react'
import { IntradayDataPoint } from './types'

interface MiniGraphProps {
  data: IntradayDataPoint[]
  width?: number
  height?: number
  color?: string
}

export default function MiniGraph({ 
  data, 
  width = 120, 
  height = 40,
  color 
}: MiniGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !data || data.length < 2) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size for retina displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Calculate min/max for scaling
    const values = data.map(d => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    // Determine color based on trend
    let lineColor = color
    if (!lineColor) {
      const firstValue = data[0].value
      const lastValue = data[data.length - 1].value
      lineColor = lastValue >= firstValue ? '#10b981' : '#ef4444' // green : red
    }

    // Draw line
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    ctx.beginPath()
    data.forEach((point, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((point.value - min) / range) * height

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw area fill (optional gradient)
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, lineColor + '40') // 25% opacity
    gradient.addColorStop(1, lineColor + '00') // 0% opacity
    
    ctx.fillStyle = gradient
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()

  }, [data, width, height, color])

  if (!data || data.length < 2) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-800/50 rounded" 
        style={{ width, height }}
      >
        <span className="text-xs text-gray-600">No data</span>
      </div>
    )
  }

  const firstValue = data[0].value
  const lastValue = data[data.length - 1].value
  const change = lastValue - firstValue
  const changePercent = (change / firstValue) * 100

  return (
    <div className="flex flex-col">
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        className="rounded"
      />
      <div className={`text-xs font-mono mt-1 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {change >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
      </div>
    </div>
  )
}
