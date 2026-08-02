import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, Layers, Plus, Trash2 } from 'lucide-react'
import type { Deck } from '@/types/deck'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImportDeck } from './ImportDeck'
import { useDecks } from './hooks'

export function DeckList() {
  const { decks, loading, createDeck, deleteDeck, refresh } = useDecks()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Deck | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await deleteDeck(pendingDelete.id)
      setPendingDelete(null)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createDeck({ name: name.trim() })
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
        <h1 className="text-2xl font-bold tracking-tight">單字牌組</h1>
        <div className="flex gap-2">
          <Button type="button" onClick={() => setShowForm(true)}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            新增牌組
          </Button>
          <ImportDeck decks={decks} onImported={refresh} />
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex items-end gap-2 rounded-xl border border-border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-top-2"
        >
          <label className="flex-1 space-y-1.5">
            <span className="block text-sm font-medium">牌組名稱</span>
            <Input
              aria-label="牌組名稱"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：C5 · Johnson's Dictionary"
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

      {decks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Layers className="mx-auto size-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="mt-3 font-medium">尚無牌組</p>
          <p className="mt-1 text-sm text-muted-foreground">點「新增牌組」建立第一副，或用「匯入牌組」載入 JSON。</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {decks.map((d, i) => {
            const lastReviewed = d.cards.reduce<number | null>((acc, c) => {
              if (c.stats.lastReviewedAt == null) return acc
              return acc == null || c.stats.lastReviewedAt > acc ? c.stats.lastReviewedAt : acc
            }, null)
            return (
              <li
                key={d.id}
                className="relative animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <Link
                  to={`/vocab/${d.id}`}
                  className="group block h-full rounded-xl border border-border bg-card p-4 pb-10 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading font-semibold group-hover:text-primary">{d.name}</span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
                      {d.cards.length} 張
                    </span>
                  </div>
                  {lastReviewed && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5" aria-hidden="true" />
                      最近練習：{new Date(lastReviewed).toLocaleString()}
                    </p>
                  )}
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`刪除牌組 ${d.name}`}
                  onClick={() => setPendingDelete(d)}
                  className="absolute bottom-2 right-2 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={() => setPendingDelete(null)}
        >
          <div
            role="dialog"
            aria-label="刪除牌組確認"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg animate-in fade-in zoom-in-95"
          >
            <h2 className="font-heading font-semibold">刪除牌組「{pendingDelete.name}」？</h2>
            <p className="mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              將刪除 {pendingDelete.cards.length} 張單字卡與其練習統計，無法復原。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setPendingDelete(null)}>
                取消
              </Button>
              <Button type="button" variant="destructive" disabled={busy} onClick={() => void handleDelete()}>
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                刪除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
