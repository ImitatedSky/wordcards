import { useParams } from 'react-router-dom'
import { DeckDetail } from '@/features/vocab/DeckDetail'

export function DeckPage() {
  const { id } = useParams()
  if (!id) return <p>缺少牌組 id。</p>
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <DeckDetail deckId={id} />
    </div>
  )
}
