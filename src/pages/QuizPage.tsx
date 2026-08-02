import { useParams } from 'react-router-dom'
import { QuizDetail } from '@/features/grammar/QuizDetail'

export function QuizPage() {
  const { id } = useParams()
  if (!id) return <p>缺少測驗 id。</p>
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <QuizDetail quizId={id} />
    </div>
  )
}
