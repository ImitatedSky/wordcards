import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, List, Play, Plus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { WordCardDialog } from '@/components/common/WordCardDialog'
import { cn } from '@/lib/utils'
import { useDeck } from './hooks'
import { CardTable } from './CardTable'
import { CardGrid } from './CardGrid'
import { CardEditor, type CardEditorValues } from './CardEditor'

type Props = {
  deckId: string
}

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; cardId: string }

export function DeckDetail({ deckId }: Props) {
  const { deck, loading, addCard, updateCard, deleteCard, toggleBuiltInTag } = useDeck(deckId)
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  if (loading) return <p>載入中…</p>
  if (!deck) return <p>找不到牌組。</p>

  const practiceDisabled = deck.cards.length === 0
  const editingCard =
    editor.mode === 'edit' ? deck.cards.find((c) => c.id === editor.cardId) : undefined

  async function handleSave(values: CardEditorValues) {
    if (editor.mode === 'create') {
      await addCard({
        front: values.front,
        back: values.back,
        example: values.example || undefined,
        pronunciation: values.pronunciation || undefined,
        notes: values.notes || undefined,
      })
    } else if (editor.mode === 'edit') {
      await updateCard(editor.cardId, {
        front: values.front,
        back: values.back,
        example: values.example || undefined,
        pronunciation: values.pronunciation || undefined,
        notes: values.notes || undefined,
      })
    }
    setEditor({ mode: 'closed' })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{deck.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{deck.cards.length} 張單字卡</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setEditor({ mode: 'create' })}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            新增單字
          </Button>
          <Link
            to={`/vocab/${deck.id}/practice`}
            aria-disabled={practiceDisabled}
            onClick={(e) => {
              if (practiceDisabled) e.preventDefault()
            }}
            className={cn(
              buttonVariants({ variant: 'default' }),
              practiceDisabled && 'pointer-events-auto cursor-not-allowed opacity-50',
            )}
          >
            <Play data-icon="inline-start" aria-hidden="true" />
            開始練習
          </Link>
        </div>
      </div>

      {deck.cards.length > 0 && (
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="group" aria-label="檢視模式">
            <Button
              type="button"
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={view === 'list'}
              aria-label="列表檢視"
              onClick={() => setView('list')}
            >
              <List data-icon="inline-start" aria-hidden="true" />
              列表
            </Button>
            <Button
              type="button"
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={view === 'grid'}
              aria-label="卡片檢視"
              onClick={() => setView('grid')}
            >
              <LayoutGrid data-icon="inline-start" aria-hidden="true" />
              卡片
            </Button>
          </div>
        </div>
      )}

      {view === 'grid' && deck.cards.length > 0 ? (
        <CardGrid
          cards={deck.cards}
          onOpen={setOpenCardId}
          onEdit={(cardId) => setEditor({ mode: 'edit', cardId })}
          onDelete={(cardId) => void deleteCard(cardId)}
          onToggleBuiltIn={(cardId, builtinId) => void toggleBuiltInTag(cardId, builtinId)}
        />
      ) : (
        <CardTable
          cards={deck.cards}
          onOpen={setOpenCardId}
          onEdit={(cardId) => setEditor({ mode: 'edit', cardId })}
          onDelete={(cardId) => void deleteCard(cardId)}
          onToggleBuiltIn={(cardId, builtinId) => void toggleBuiltInTag(cardId, builtinId)}
        />
      )}

      {openCardId && (() => {
        const card = deck.cards.find((c) => c.id === openCardId)
        return card ? <WordCardDialog card={card} deckName={deck.name} onClose={() => setOpenCardId(null)} /> : null
      })()}

      {editor.mode !== 'closed' && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CardEditor
            mode={editor.mode}
            initial={
              editingCard
                ? {
                    front: editingCard.front,
                    back: editingCard.back,
                    example: editingCard.example ?? '',
                    pronunciation: editingCard.pronunciation ?? '',
                    notes: editingCard.notes ?? '',
                  }
                : undefined
            }
            onSave={handleSave}
            onCancel={() => setEditor({ mode: 'closed' })}
          />
        </div>
      )}
    </div>
  )
}
