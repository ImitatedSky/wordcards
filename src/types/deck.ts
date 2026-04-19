export type LanguageCode = string // "en", "zh", "ja", ...

export type CardStats = {
  correctCount: number
  incorrectCount: number
  lastReviewedAt: number | null
  // Reserved for SRS (unused in v1)
  easeFactor?: number
  interval?: number
  nextReviewAt?: number | null
}

export type Card = {
  id: string
  front: string
  back: string
  example?: string
  pronunciation?: string
  notes?: string
  tags: string[]
  stats: CardStats
}

export type Deck = {
  id: string
  name: string
  description?: string
  language: {
    front: LanguageCode
    back: LanguageCode
  }
  cards: Card[]
  tags: string[]
  createdAt: number
  updatedAt: number
}

export const DEFAULT_DECK_LANGUAGE = { front: 'en', back: 'zh' } as const
