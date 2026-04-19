import type { Card, Deck } from '@/types/deck'
import { DEFAULT_DECK_LANGUAGE } from '@/types/deck'
import { newId } from '@/utils/uuid'

type NewCardInput = {
  front: string
  back: string
  example?: string
  pronunciation?: string
  notes?: string
  tags?: string[]
}

export function newCard(input: NewCardInput): Card {
  return {
    id: newId(),
    front: input.front,
    back: input.back,
    example: input.example,
    pronunciation: input.pronunciation,
    notes: input.notes,
    tags: input.tags ?? [],
    stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
  }
}

type NewDeckInput = {
  name: string
  description?: string
  language?: Deck['language']
  tags?: string[]
}

export function newDeck(input: NewDeckInput): Deck {
  const now = Date.now()
  return {
    id: newId(),
    name: input.name,
    description: input.description,
    language: input.language ?? { ...DEFAULT_DECK_LANGUAGE },
    cards: [],
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }
}
