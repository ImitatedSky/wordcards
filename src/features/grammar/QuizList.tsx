import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, GraduationCap, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImportQuiz } from './ImportQuiz'
import { useQuizzes } from './hooks'

export function QuizList() {
  const { quizzes, loading, createQuiz, refresh } = useQuizzes()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createQuiz({ name: name.trim() })
    setName('')
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="載入中">
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">文法測驗</h1>
        <div className="flex gap-2">
          <Button type="button" onClick={() => setShowForm(true)}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            新增測驗
          </Button>
          <ImportQuiz quizzes={quizzes} onImported={refresh} />
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex items-end gap-2 rounded-xl border border-border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-top-2"
        >
          <label className="flex-1 space-y-1.5">
            <span className="block text-sm font-medium">測驗名稱</span>
            <Input
              aria-label="測驗名稱"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：時態綜合練習"
              autoFocus
            />
          </label>
          <Button type="submit">建立</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowForm(false)
              setName('')
            }}
          >
            取消
          </Button>
        </form>
      )}

      {quizzes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <GraduationCap className="mx-auto size-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="mt-3 font-medium">尚無測驗</p>
          <p className="mt-1 text-sm text-muted-foreground">點「新增測驗」建立第一組題目，或之後從 JSON 匯入。</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quizzes.map((q, i) => {
            const lastReviewed = q.questions.reduce<number | null>((acc, item) => {
              if (item.stats.lastReviewedAt == null) return acc
              return acc == null || item.stats.lastReviewedAt > acc
                ? item.stats.lastReviewedAt
                : acc
            }, null)
            return (
              <li
                key={q.id}
                className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <Link
                  to={`/grammar/${q.id}`}
                  className="group block h-full rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading font-semibold group-hover:text-primary">{q.name}</span>
                    <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium tabular-nums text-success">
                      {q.questions.length} 題
                    </span>
                  </div>
                  {lastReviewed && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5" aria-hidden="true" />
                      最近練習：{new Date(lastReviewed).toLocaleString()}
                    </p>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
