import { BUILTIN_FAVORITE_ID, BUILTIN_STAR_ID } from '@/types/tag'

type Props = {
  tags: string[]
  onToggle: (builtinId: string) => void
}

export function FavoriteStarButtons({ tags, onToggle }: Props) {
  const isFavorite = tags.includes(BUILTIN_FAVORITE_ID)
  const isStar = tags.includes(BUILTIN_STAR_ID)

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label="切換 我的最愛"
        aria-pressed={isFavorite}
        onClick={() => onToggle(BUILTIN_FAVORITE_ID)}
        className="w-8 h-8 rounded hover:bg-slate-100 text-lg"
      >
        {isFavorite ? '❤️' : '🤍'}
      </button>
      <button
        type="button"
        aria-label="切換 星號"
        aria-pressed={isStar}
        onClick={() => onToggle(BUILTIN_STAR_ID)}
        className="w-8 h-8 rounded hover:bg-slate-100 text-lg"
      >
        {isStar ? '⭐' : '☆'}
      </button>
    </div>
  )
}
