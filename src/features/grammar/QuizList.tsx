import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuizzes } from './hooks'

export function QuizList() {
  const { quizzes, loading, createQuiz } = useQuizzes()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createQuiz({ name: name.trim() })
    setName('')
    setShowForm(false)
  }

  if (loading) return <p>載入中…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">文法測驗</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded px-3 py-1 bg-slate-800 text-white"
          >
            新增測驗
          </button>
          <button
            type="button"
            disabled
            title="匯入功能在 Import/Export 階段實作"
            className="rounded px-3 py-1 border text-slate-400 cursor-not-allowed"
          >
            匯入 JSON
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-2 items-end">
          <label className="flex-1">
            <span className="block text-sm">測驗名稱</span>
            <input
              aria-label="測驗名稱"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border px-2 py-1"
              autoFocus
            />
          </label>
          <button type="submit" className="rounded px-3 py-1 bg-slate-800 text-white">
            建立
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false)
              setName('')
            }}
            className="rounded px-3 py-1 border"
          >
            取消
          </button>
        </form>
      )}

      {quizzes.length === 0 ? (
        <p className="text-slate-500">尚無測驗。點「新增測驗」或等 Import/Export 階段後匯入。</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quizzes.map((q) => {
            const lastReviewed = q.questions.reduce<number | null>((acc, item) => {
              if (item.stats.lastReviewedAt == null) return acc
              return acc == null || item.stats.lastReviewedAt > acc
                ? item.stats.lastReviewedAt
                : acc
            }, null)
            return (
              <li key={q.id} className="rounded border p-3">
                <Link to={`/grammar/${q.id}`} className="font-medium underline">
                  {q.name}
                </Link>
                <p className="text-sm text-slate-500">{q.questions.length} 題</p>
                {lastReviewed && (
                  <p className="text-xs text-slate-400">
                    最近練習：{new Date(lastReviewed).toLocaleString()}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
