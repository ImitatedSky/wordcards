/**
 * Flashcard dialog display preferences — a UI preference like the theme,
 * persisted in localStorage (not IStorage). Read fresh on each dialog open.
 */

export type CardDisplayLevel = 'sm' | 'md' | 'lg'

export type CardDisplayPrefs = {
  /** Dialog width */
  size: CardDisplayLevel
  /** Text scale inside the dialog */
  fontSize: CardDisplayLevel
}

const KEY = 'cardDisplayPrefs'
const DEFAULTS: CardDisplayPrefs = { size: 'sm', fontSize: 'sm' }
const LEVELS: readonly CardDisplayLevel[] = ['sm', 'md', 'lg']

function isLevel(v: unknown): v is CardDisplayLevel {
  return typeof v === 'string' && (LEVELS as readonly string[]).includes(v)
}

export function getCardDisplayPrefs(): CardDisplayPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<CardDisplayPrefs>
    return {
      size: isLevel(parsed.size) ? parsed.size : DEFAULTS.size,
      fontSize: isLevel(parsed.fontSize) ? parsed.fontSize : DEFAULTS.fontSize,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setCardDisplayPrefs(patch: Partial<CardDisplayPrefs>): CardDisplayPrefs {
  const next = { ...getCardDisplayPrefs(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: preference lives for this render only */
  }
  return next
}

/** Dialog width per size level. */
export const CARD_SIZE_CLASS: Record<CardDisplayLevel, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

/** Text classes per font level: [front, back, example, notes]. */
export const CARD_FONT_CLASS: Record<
  CardDisplayLevel,
  { front: string; back: string; example: string; notes: string }
> = {
  sm: { front: 'text-2xl', back: 'text-lg', example: 'text-sm', notes: 'text-xs' },
  md: { front: 'text-3xl', back: 'text-xl', example: 'text-base', notes: 'text-sm' },
  lg: { front: 'text-4xl', back: 'text-2xl', example: 'text-lg', notes: 'text-base' },
}
