import { useParams } from 'react-router-dom'
import { QuizDetail } from '@/features/grammar/QuizDetail'

export function QuizPage() {
  const { id } = useParams()
  if (!id) return <p>缺少測驗 id。</p>
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <QuizDetail quizId={id} />
    </div>
  )
}
