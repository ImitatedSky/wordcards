import { Pencil, Trash2 } from 'lucide-react'
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

/** Grid view of a deck's cards — same actions as the table, block layout. */
export function CardGrid({ cards, onOpen, onEdit, onDelete, onToggleBuiltIn }: Props) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <li
          key={c.id}
          className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <button
            type="button"
            onClick={() => onOpen(c.id)}
            aria-label={`查看單字卡 ${c.front}`}
            className="flex-1 rounded-t-xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="font-heading font-semibold">{c.front}</div>
            <div className="mt-1 text-sm text-muted-foreground">{c.back}</div>
            {c.example && (
              <p className="mt-2 line-clamp-2 text-xs italic text-muted-foreground/80">{c.example}</p>
            )}
          </button>
          <div className="flex items-center justify-between gap-1 border-t border-border px-2 py-1.5">
            <FavoriteStarButtons
              tags={c.tags}
              onToggle={(builtinId) => onToggleBuiltIn(c.id, builtinId)}
            />
            <div className="flex items-center">
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
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
