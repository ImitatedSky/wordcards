import type { Card } from '@/types/deck'
import { FavoriteStarButtons } from '@/components/common/FavoriteStarButtons'

type Props = {
  cards: Card[]
  onEdit: (cardId: string) => void
  onDelete: (cardId: string) => void
  onToggleBuiltIn: (cardId: string, builtinId: string) => void
}

export function CardTable({ cards, onEdit, onDelete, onToggleBuiltIn }: Props) {
  if (cards.length === 0) {
    return <p className="text-slate-500">這個牌組還沒有單字。</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b">
          <th className="py-1 pr-2">正面</th>
          <th className="py-1 pr-2">背面</th>
          <th className="py-1 pr-2">標記</th>
          <th className="py-1 pr-2 text-right">操作</th>
        </tr>
      </thead>
      <tbody>
        {cards.map((c) => (
          <tr key={c.id} className="border-b last:border-b-0">
            <td className="py-1 pr-2">{c.front}</td>
            <td className="py-1 pr-2">{c.back}</td>
            <td className="py-1 pr-2">
              <FavoriteStarButtons
                tags={c.tags}
                onToggle={(builtinId) => onToggleBuiltIn(c.id, builtinId)}
              />
            </td>
            <td className="py-1 pr-2 text-right">
              <button
                type="button"
                onClick={() => onEdit(c.id)}
                className="text-sm underline mr-2"
              >
                編輯
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
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
