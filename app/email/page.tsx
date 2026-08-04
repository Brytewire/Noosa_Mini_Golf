'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGameStore } from '@/lib/store'

export default function EmailPage() {
  const router = useRouter()
  const { players } = useGameStore()

  useEffect(() => {
    if (players.length === 0) {
      router.replace('/')
    } else {
      router.replace('/score/1')
    }
  }, [players.length, router])

  return <div className="min-h-screen bg-pp-bg" />
}
