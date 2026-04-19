import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDeck } from './hooks'
import { CardTable } from './CardTable'
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{deck.name}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditor({ mode: 'create' })}
            className="rounded px-3 py-1 bg-slate-800 text-white"
          >
            新增單字
          </button>
          <Link
            to={`/vocab/${deck.id}/practice`}
            aria-disabled={practiceDisabled}
            onClick={(e) => {
              if (practiceDisabled) e.preventDefault()
            }}
            className={
              'rounded px-3 py-1 border ' +
              (practiceDisabled ? 'text-slate-400 cursor-not-allowed' : 'hover:bg-slate-50')
            }
          >
            開始練習
          </Link>
        </div>
      </div>

      <CardTable
        cards={deck.cards}
        onEdit={(cardId) => setEditor({ mode: 'edit', cardId })}
        onDelete={(cardId) => void deleteCard(cardId)}
        onToggleBuiltIn={(cardId, builtinId) => void toggleBuiltInTag(cardId, builtinId)}
      />

      {editor.mode !== 'closed' && (
        <div className="rounded border p-3 bg-slate-50">
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
