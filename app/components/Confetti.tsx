'use client'

import { useEffect, useState } from 'react'

const COLORS = ['#1B4B44', '#8FBBAE', '#E8A98B', '#F5F0A9', '#8FBBAE', '#E8A98B']

interface Piece {
  id: number
  color: string
  left: number
  delay: number
  duration: number
  size: number
  rotate: number
}

export function Confetti() {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    const next: Piece[] = Array.from({ length: 64 }, (_, i) => ({
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      duration: 2.5 + Math.random() * 2,
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
    }))
    setPieces(next)
    const t = setTimeout(() => setPieces([]), 6000)
    return () => clearTimeout(t)
  }, [])

  if (pieces.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="animate-confetti absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
