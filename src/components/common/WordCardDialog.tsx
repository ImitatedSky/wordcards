import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Volume2, X } from 'lucide-react'
import type { Card } from '@/types/deck'
import { Button, buttonVariants } from '@/components/ui/button'
import { headwordOf } from '@/utils/headword'
import { canSpeak, speakWord } from '@/utils/speech'
import {
  CARD_FONT_CLASS,
  CARD_SIZE_CLASS,
  getCardDisplayPrefs,
} from '@/utils/cardDisplayPrefs'
import { cn } from '@/lib/utils'

type Props = {
  card: Card
  /** Shown in the footer when provided. */
  deckName?: string
  /** When provided, renders a 練習這副牌組 shortcut to this route. */
  practiceTo?: string
  onClose: () => void
}

/** Full flashcard detail dialog — shared by the floating background, deck
    views, and the session results word list. Size and font scale follow the
    display preferences set on the settings page. */
export function WordCardDialog({ card, deckName, practiceTo, onClose }: Props) {
  // Read once per open — the settings page can't be open at the same time.
  const [prefs] = useState(getCardDisplayPrefs)
  const font = CARD_FONT_CLASS[prefs.fontSize]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={`單字卡：${headwordOf(card)}`}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'max-h-[85dvh] w-full overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-lg animate-in fade-in zoom-in-95',
          CARD_SIZE_CLASS[prefs.size],
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className={cn('font-heading font-bold', font.front)}>{card.front}</h2>
              {canSpeak() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="唸出單字"
                  onClick={() => speakWord(headwordOf(card))}
                  className="shrink-0 text-primary hover:bg-primary/10"
                >
                  <Volume2 aria-hidden="true" />
                </Button>
              )}
            </div>
            {card.pronunciation && (
              <p className={cn('mt-0.5 text-muted-foreground', font.example)}>{card.pronunciation}</p>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="關閉單字卡" onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        </div>

        <p className={cn('mt-3 font-medium text-primary', font.back)}>{card.back}</p>
        {card.example && (
          <p className={cn('mt-2 italic text-muted-foreground', font.example)}>{card.example}</p>
        )}
        {card.notes && (
          <p
            className={cn(
              'mt-3 max-h-72 overflow-y-auto whitespace-pre-line rounded-lg bg-muted/50 p-3 leading-relaxed text-muted-foreground',
              font.notes,
            )}
          >
            {card.notes}
          </p>
        )}

        {(deckName || practiceTo) && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">{deckName}</span>
            {practiceTo && (
              <Link
                to={practiceTo}
                className={buttonVariants({ variant: 'default', size: 'sm' })}
                onClick={onClose}
              >
                <Play data-icon="inline-start" aria-hidden="true" />
                練習這副牌組
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
