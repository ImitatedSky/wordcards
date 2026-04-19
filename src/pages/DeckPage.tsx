import { useParams } from 'react-router-dom'
import { DeckDetail } from '@/features/vocab/DeckDetail'

export function DeckPage() {
  const { id } = useParams()
  if (!id) return <p>缺少牌組 id。</p>
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <DeckDetail deckId={id} />
    </div>
  )
}
