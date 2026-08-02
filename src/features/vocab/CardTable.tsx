import { Pencil, Trash2, WholeWord } from 'lucide-react'
import type { Card } from '@/types/deck'
import { FavoriteStarButtons } from '@/components/common/FavoriteStarButtons'
import { Button } from '@/components/ui/button'

type Props = {
  cards: Card[]
  onOpen: (cardId: string) => void
  onEdit: (cardId: string) => void
  onDelete: (cardId: string) => void
  onToggleBuiltIn: (cardId: string, builtinId: string) => void
}

export function CardTable({ cards, onOpen, onEdit, onDelete, onToggleBuiltIn }: Props) {
  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <WholeWord className="mx-auto size-10 text-muted-foreground/40" aria-hidden="true" />
        <p className="mt-3 font-medium">這個牌組還沒有單字。</p>
        <p className="mt-1 text-sm text-muted-foreground">點「新增單字」加入第一張卡片。</p>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">正面</th>
            <th className="px-4 py-2.5 font-medium">背面</th>
            <th className="px-4 py-2.5 font-medium">標記</th>
            <th className="px-4 py-2.5 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr
              key={c.id}
              onClick={() => onOpen(c.id)}
              className="cursor-pointer border-b border-border transition-colors last:border-b-0 odd:bg-muted/20 hover:bg-accent/40"
            >
              <td className="px-4 py-2 font-medium">
                {/* Focusable so the card can also be opened via keyboard */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpen(c.id)
                  }}
                  className="rounded text-left font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {c.front}
                </button>
              </td>
              <td className="px-4 py-2 text-muted-foreground">{c.back}</td>
              <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                <FavoriteStarButtons
                  tags={c.tags}
                  onToggle={(builtinId) => onToggleBuiltIn(c.id, builtinId)}
                />
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(c.id)}>
                  <Pencil data-icon="inline-start" aria-hidden="true" />
                  編輯
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="ml-1"
                  onClick={() => onDelete(c.id)}
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
