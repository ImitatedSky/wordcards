import { Heart, Star } from 'lucide-react'
import { BUILTIN_FAVORITE_ID, BUILTIN_STAR_ID } from '@/types/tag'
import { cn } from '@/lib/utils'

type Props = {
  tags: string[]
  onToggle: (builtinId: string) => void
}

export function FavoriteStarButtons({ tags, onToggle }: Props) {
  const isFavorite = tags.includes(BUILTIN_FAVORITE_ID)
  const isStar = tags.includes(BUILTIN_STAR_ID)

  return (
    <div className="inline-flex items-center gap-0.5">
      <button
        type="button"
        aria-label="切換 我的最愛"
        aria-pressed={isFavorite}
        onClick={() => onToggle(BUILTIN_FAVORITE_ID)}
        className={cn(
          'flex size-9 items-center justify-center rounded-lg transition-colors pointer-coarse:size-11',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isFavorite ? 'text-destructive' : 'text-muted-foreground/60 hover:text-muted-foreground',
        )}
      >
        <Heart className="size-4.5 transition-transform active:scale-90" fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="切換 星號"
        aria-pressed={isStar}
        onClick={() => onToggle(BUILTIN_STAR_ID)}
        className={cn(
          'flex size-9 items-center justify-center rounded-lg transition-colors pointer-coarse:size-11',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isStar ? 'text-chart-3' : 'text-muted-foreground/60 hover:text-muted-foreground',
        )}
      >
        <Star className="size-4.5 transition-transform active:scale-90" fill={isStar ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </div>
  )
}
