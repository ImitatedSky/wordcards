import { useParams } from 'react-router-dom'
import { PracticeSession } from '@/features/vocab/practice/PracticeSession'

export function PracticePage() {
  const { id } = useParams()
  if (!id) return <p>缺少牌組 id。</p>
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <PracticeSession deckId={id} />
    </div>
  )
}
