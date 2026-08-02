import { useParams } from 'react-router-dom'
import { QuizSession } from '@/features/grammar/session/QuizSession'

export function QuizSessionPage() {
  const { id } = useParams()
  if (!id) return <p>缺少測驗 id。</p>
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <QuizSession quizId={id} />
    </div>
  )
}
