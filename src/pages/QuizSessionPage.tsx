import { useParams } from 'react-router-dom'
import { QuizSession } from '@/features/grammar/session/QuizSession'

export function QuizSessionPage() {
  const { id } = useParams()
  if (!id) return <p>缺少測驗 id。</p>
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <QuizSession quizId={id} />
    </div>
  )
}
