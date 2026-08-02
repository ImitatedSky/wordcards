import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { splitCounts, usePracticeSession } from './usePracticeSession'

describe('splitCounts', () => {
  it('splits by ratio with rounding', () => {
    expect(splitCounts(20, 0.25)).toEqual([5, 15])
    expect(splitCounts(20, 0.75)).toEqual([15, 5])
    expect(splitCounts(4, 0.5)).toEqual([2, 2])
  })

  it('guarantees both modes at least one question when possible', () => {
    expect(splitCounts(3, 0.25)).toEqual([1, 2])
    expect(splitCounts(2, 0.9)).toEqual([1, 1])
    expect(splitCounts(1, 0.25)).toEqual([1, 0])
    expect(splitCounts(0, 0.5)).toEqual([0, 0])
  })
})
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
      () => usePracticeSession(deck.id, { modes: ['flip'], shuffle: false }),
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
      () => usePracticeSession(deck.id, { modes: ['flip'], shuffle: false }),
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
      () => usePracticeSession(deck.id, { modes: ['flip'], shuffle: false }),
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

  it('tagIds narrows the queue to cards carrying a selected tag', async () => {
    const deck = newDeck({ name: 'Tagged' })
    const fav = newCard({ front: 'f0', back: 'b0' })
    fav.tags = ['builtin-favorite']
    const plain = newCard({ front: 'f1', back: 'b1' })
    const starred = newCard({ front: 'f2', back: 'b2' })
    starred.tags = ['builtin-star']
    deck.cards = [fav, plain, starred]
    await storage.saveDeck(deck)

    const { result } = renderHook(
      () =>
        usePracticeSession(deck.id, {
          modes: ['flip'],
          shuffle: false,
          tagIds: ['builtin-favorite'],
        }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    expect(result.current.state.queue).toEqual([fav.id])
    expect(result.current.cards.map((c) => c.id)).toEqual([fav.id])
  })

  it('empty tagIds keeps the full pool', async () => {
    const deck = await seedDeckWithCards(3)
    const { result } = renderHook(
      () => usePracticeSession(deck.id, { modes: ['flip'], shuffle: false, tagIds: [] }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    expect(result.current.state.queue).toHaveLength(3)
  })

  it('merges multiple decks and writes stats back to the owning deck', async () => {
    const d1 = newDeck({ name: 'A' })
    d1.cards = [newCard({ front: 'a0', back: 'x' })]
    const d2 = newDeck({ name: 'B' })
    d2.cards = [newCard({ front: 'b0', back: 'y' })]
    await storage.saveDeck(d1)
    await storage.saveDeck(d2)

    const { result } = renderHook(
      () => usePracticeSession([d1.id, d2.id], { modes: ['flip'], shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    expect(result.current.state.queue).toEqual([d1.cards[0].id, d2.cards[0].id])
    expect(result.current.cards).toHaveLength(2)

    await act(async () => result.current.submit({ kind: 'flip', result: 'correct' }))
    await act(async () => result.current.next())
    await act(async () => result.current.submit({ kind: 'flip', result: 'incorrect' }))
    await act(async () => result.current.next())
    expect(result.current.state.phase).toBe('finished')

    const saved1 = await storage.getDeck(d1.id)
    const saved2 = await storage.getDeck(d2.id)
    expect(saved1!.cards[0].stats.correctCount).toBe(1)
    expect(saved1!.cards[0].stats.incorrectCount).toBe(0)
    expect(saved2!.cards[0].stats.incorrectCount).toBe(1)
    expect(saved2!.cards[0].stats.correctCount).toBe(0)
  })

  it('mixed modes segment the queue by ratio in selection order', async () => {
    const deck = await seedDeckWithCards(4)
    const { result } = renderHook(
      () =>
        usePracticeSession(deck.id, {
          modes: ['flip', 'multiple_choice'],
          modeRatio: 0.5,
          shuffle: false,
        }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    expect(result.current.state.queueModes).toEqual([
      'flip',
      'flip',
      'multiple_choice',
      'multiple_choice',
    ])
    // flip segment: no MC sample yet
    expect(result.current.state.mcChoices).toBeUndefined()

    await act(async () => result.current.submit({ kind: 'flip', result: 'correct' }))
    await act(async () => result.current.next())
    await act(async () => result.current.submit({ kind: 'flip', result: 'correct' }))
    await act(async () => result.current.next())

    // entering the multiple-choice segment computes options
    expect(result.current.state.queueModes[result.current.state.index]).toBe('multiple_choice')
    expect(result.current.state.mcChoices).toHaveLength(4)
    const correctIdx = result.current.state.mcCorrectIndex!
    await act(async () => result.current.submit({ kind: 'mc', optionIndex: correctIdx }))
    await act(async () => result.current.next())
    await act(async () =>
      result.current.submit({ kind: 'mc', optionIndex: (result.current.state.mcCorrectIndex! + 1) % 4 }),
    )
    await act(async () => result.current.next())
    expect(result.current.state.phase).toBe('finished')
    expect(Object.values(result.current.state.answers).filter((r) => r === 'correct')).toHaveLength(3)
  })

  it('uncertain answers bump neither counter but join the review queue', async () => {
    const deck = await seedDeckWithCards(2)
    const { result } = renderHook(
      () => usePracticeSession(deck.id, { modes: ['flip'], shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))

    await act(async () => result.current.submit({ kind: 'flip', result: 'uncertain' }))
    await act(async () => result.current.next())
    await act(async () => result.current.submit({ kind: 'flip', result: 'correct' }))
    await act(async () => result.current.next())
    expect(result.current.state.phase).toBe('finished')

    // stats: uncertain card has zero counters but a review timestamp
    const saved = await storage.getDeck(deck.id)
    const uncertainCard = saved!.cards[0]
    expect(uncertainCard.stats.correctCount).toBe(0)
    expect(uncertainCard.stats.incorrectCount).toBe(0)
    expect(uncertainCard.stats.lastReviewedAt).not.toBeNull()

    // review queue includes the uncertain card, excludes the correct one
    await act(async () => result.current.reviewIncorrect())
    expect(result.current.state.queue).toEqual([deck.cards[0].id])
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
      () => usePracticeSession(deck.id, { modes: ['multiple_choice'], shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    expect(result.current.state.mcChoices).toHaveLength(4)
    const correctIndex = result.current.state.mcCorrectIndex!

    await act(async () => result.current.submit({ kind: 'mc', optionIndex: correctIndex }))
    expect(result.current.state.answers[deck.cards[0].id]).toBe('correct')
  })
})
