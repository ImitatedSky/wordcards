import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDecks } from './hooks'

export function DeckList() {
  const { decks, loading, createDeck } = useDecks()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createDeck({ name: name.trim() })
    setName('')
    setShowForm(false)
  }

  if (loading) return <p>載入中…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">單字牌組</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded px-3 py-1 bg-slate-800 text-white"
          >
            新增牌組
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
            <span className="block text-sm">牌組名稱</span>
            <input
              aria-label="牌組名稱"
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

      {decks.length === 0 ? (
        <p className="text-slate-500">尚無牌組。點「新增牌組」或等 Import/Export 階段後匯入。</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {decks.map((d) => {
            const lastReviewed = d.cards.reduce<number | null>((acc, c) => {
              if (c.stats.lastReviewedAt == null) return acc
              return acc == null || c.stats.lastReviewedAt > acc ? c.stats.lastReviewedAt : acc
            }, null)
            return (
              <li key={d.id} className="rounded border p-3">
                <Link to={`/vocab/${d.id}`} className="font-medium underline">
                  {d.name}
                </Link>
                <p className="text-sm text-slate-500">{d.cards.length} 張單字</p>
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
