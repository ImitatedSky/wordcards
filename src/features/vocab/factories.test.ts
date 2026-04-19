import { describe, it, expect } from 'vitest'
import { newCard, newDeck } from './factories'
import { DEFAULT_DECK_LANGUAGE } from '@/types/deck'

describe('newCard', () => {
  it('creates a card with defaults and a fresh id', () => {
    const card = newCard({ front: 'hello', back: '你好' })
    expect(card.id).toMatch(/.+/)
    expect(card.front).toBe('hello')
    expect(card.back).toBe('你好')
    expect(card.tags).toEqual([])
    expect(card.stats).toEqual({ correctCount: 0, incorrectCount: 0, lastReviewedAt: null })
  })

  it('allows overrides', () => {
    const card = newCard({ front: 'a', back: 'b', tags: ['t1'], notes: 'n' })
    expect(card.tags).toEqual(['t1'])
    expect(card.notes).toBe('n')
  })

  it('produces distinct ids', () => {
    const a = newCard({ front: 'x', back: 'y' })
    const b = newCard({ front: 'x', back: 'y' })
    expect(a.id).not.toBe(b.id)
  })
})

describe('newDeck', () => {
  it('creates a deck with defaults', () => {
    const deck = newDeck({ name: 'My Deck' })
    expect(deck.id).toMatch(/.+/)
    expect(deck.name).toBe('My Deck')
    expect(deck.language).toEqual(DEFAULT_DECK_LANGUAGE)
    expect(deck.cards).toEqual([])
    expect(deck.tags).toEqual([])
    expect(deck.createdAt).toBeGreaterThan(0)
    expect(deck.updatedAt).toBe(deck.createdAt)
  })
})
