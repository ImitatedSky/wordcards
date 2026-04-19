import type { Question } from '@/types/quiz'
import { FavoriteStarButtons } from '@/components/common/FavoriteStarButtons'

type Props = {
  questions: Question[]
  onEdit: (questionId: string) => void
  onDelete: (questionId: string) => void
  onToggleBuiltIn: (questionId: string, builtinId: string) => void
}

function summarize(q: Question): string {
  if (q.type === 'multiple_choice') {
    const correct = q.options[q.correctIndex] ?? '(無正解)'
    return `選擇題 · 正解：${correct}`
  }
  return `填空 · 答案：${q.answers.join(' / ')}`
}

export function QuestionTable({ questions, onEdit, onDelete, onToggleBuiltIn }: Props) {
  if (questions.length === 0) {
    return <p className="text-slate-500">這個測驗還沒有題目。</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b">
          <th className="py-1 pr-2">題目</th>
          <th className="py-1 pr-2">型態/正解</th>
          <th className="py-1 pr-2">標記</th>
          <th className="py-1 pr-2 text-right">操作</th>
        </tr>
      </thead>
      <tbody>
        {questions.map((q) => (
          <tr key={q.id} className="border-b last:border-b-0">
            <td className="py-1 pr-2">{q.prompt}</td>
            <td className="py-1 pr-2 text-slate-600">{summarize(q)}</td>
            <td className="py-1 pr-2">
              <FavoriteStarButtons
                tags={q.tags}
                onToggle={(builtinId) => onToggleBuiltIn(q.id, builtinId)}
              />
            </td>
            <td className="py-1 pr-2 text-right">
              <button
                type="button"
                onClick={() => onEdit(q.id)}
                className="text-sm underline mr-2"
              >
                編輯
              </button>
              <button
                type="button"
                onClick={() => onDelete(q.id)}
                className="text-sm text-red-600 underline"
              >
                刪除
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
