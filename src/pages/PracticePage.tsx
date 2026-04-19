import { useParams } from 'react-router-dom'
import { PracticeSession } from '@/features/vocab/practice/PracticeSession'

export function PracticePage() {
  const { id } = useParams()
  if (!id) return <p>缺少牌組 id。</p>
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PracticeSession deckId={id} />
    </div>
  )
}
