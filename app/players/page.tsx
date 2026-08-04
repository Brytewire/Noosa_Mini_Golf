import { Suspense } from 'react'
import { PlayersForm } from './PlayersForm'

export default function PlayersPage() {
  return (
    <Suspense>
      <PlayersForm />
    </Suspense>
  )
}
