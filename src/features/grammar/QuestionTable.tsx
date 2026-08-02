import { ListChecks, Pencil, Trash2 } from 'lucide-react'
import type { Question } from '@/types/quiz'
import { FavoriteStarButtons } from '@/components/common/FavoriteStarButtons'
import { Button } from '@/components/ui/button'

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
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <ListChecks className="mx-auto size-10 text-muted-foreground/40" aria-hidden="true" />
        <p className="mt-3 font-medium">這個測驗還沒有題目。</p>
        <p className="mt-1 text-sm text-muted-foreground">點「新增題目」加入第一題。</p>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">題目</th>
            <th className="px-4 py-2.5 font-medium">型態/正解</th>
            <th className="px-4 py-2.5 font-medium">標記</th>
            <th className="px-4 py-2.5 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <tr
              key={q.id}
              className="border-b border-border transition-colors last:border-b-0 odd:bg-muted/20 hover:bg-accent/40"
            >
              <td className="px-4 py-2 font-medium">{q.prompt}</td>
              <td className="px-4 py-2 text-muted-foreground">{summarize(q)}</td>
              <td className="px-4 py-2">
                <FavoriteStarButtons
                  tags={q.tags}
                  onToggle={(builtinId) => onToggleBuiltIn(q.id, builtinId)}
                />
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap">
                <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(q.id)}>
                  <Pencil data-icon="inline-start" aria-hidden="true" />
                  編輯
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="ml-1"
                  onClick={() => onDelete(q.id)}
                >
                  <Trash2 data-icon="inline-start" aria-hidden="true" />
                  刪除
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
