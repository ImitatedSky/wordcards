import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { usePracticeSession } from './usePracticeSession'
import { newDeck } from '../factories'
import { newCard } from '../factories'

async function freshStorage(previous: IndexedDBStorage | null): Promise<IndexedDBStorage> {
  if (previous) await previous.close()
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('english-app')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('deleteDatabase blocked'))
  })
  const s = new IndexedDBStorage()
  await s.ready()
  return s
}

function wrapper(storage: IndexedDBStorage) {
  return ({ children }: { children: ReactNode }) => (
    <StorageProvider storage={storage}>{children}</StorageProvider>
  )
}

describe('usePracticeSession (flip)', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  async function seedDeckWithCards(count: number) {
    const deck = newDeck({ name: 'Deck' })
    deck.cards = Array.from({ length: count }, (_, i) =>
      newCard({ front: `f${i}`, back: `b${i}` }),
    )
    await storage.saveDeck(deck)
    return deck
  }

  it('loads a deck, answers all cards, and finishes', async () => {
    const deck = await seedDeckWithCards(2)
    const { result } = renderHook(
      () => usePracticeSession(deck.id, { mode: 'flip', shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    expect(result.current.state.queue).toHaveLength(2)

    await act(async () => result.current.submit({ kind: 'flip', result: 'correct' }))
    expect(result.current.state.phase).toBe('revealed')
    await act(async () => result.current.next())
    expect(result.current.state.phase).toBe('prompting')
    expect(result.current.state.index).toBe(1)

    await act(async () => result.current.submit({ kind: 'flip', result: 'incorrect' }))
    await act(async () => result.current.next())
    expect(result.current.state.phase).toBe('finished')
  })

  it('persists stats to storage after each answer', async () => {
    const deck = await seedDeckWithCards(1)
    const cardId = deck.cards[0].id
    const { result } = renderHook(
      () => usePracticeSession(deck.id, { mode: 'flip', shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    await act(async () => result.current.submit({ kind: 'flip', result: 'correct' }))

    const saved = await storage.getDeck(deck.id)
    const card = saved!.cards.find((c) => c.id === cardId)!
    expect(card.stats.correctCount).toBe(1)
    expect(card.stats.lastReviewedAt).not.toBeNull()
  })

  it('reviewIncorrect rebuilds the queue from incorrect answers only', async () => {
    const deck = await seedDeckWithCards(3)
    const { result } = renderHook(
      () => usePracticeSession(deck.id, { mode: 'flip', shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    await act(async () => result.current.submit({ kind: 'flip', result: 'correct' }))
    await act(async () => result.current.next())
    await act(async () => result.current.submit({ kind: 'flip', result: 'incorrect' }))
    await act(async () => result.current.next())
    await act(async () => result.current.submit({ kind: 'flip', result: 'incorrect' }))
    await act(async () => result.current.next())
    expect(result.current.state.phase).toBe('finished')

    await act(async () => result.current.reviewIncorrect())
    expect(result.current.state.phase).toBe('prompting')
    expect(result.current.state.queue).toHaveLength(2)
    expect(result.current.state.index).toBe(0)
    expect(result.current.state.answers).toEqual({})
  })
})

describe('usePracticeSession (multiple choice)', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('computes mcChoices on prompt and scores correctly', async () => {
    const deck = newDeck({ name: 'MC' })
    deck.cards = [
      newCard({ front: 'a', back: 'A' }),
      newCard({ front: 'b', back: 'B' }),
      newCard({ front: 'c', back: 'C' }),
      newCard({ front: 'd', back: 'D' }),
    ]
    await storage.saveDeck(deck)

    const { result } = renderHook(
      () => usePracticeSession(deck.id, { mode: 'multiple_choice', shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    expect(result.current.state.mcChoices).toHaveLength(4)
    const correctIndex = result.current.state.mcCorrectIndex!

    await act(async () => result.current.submit({ kind: 'mc', optionIndex: correctIndex }))
    expect(result.current.state.answers[deck.cards[0].id]).toBe('correct')
  })
})
