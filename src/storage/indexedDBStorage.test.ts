import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IndexedDBStorage } from './indexedDBStorage'
import type { Deck } from '@/types/deck'

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd1',
    name: 'Test Deck',
    language: { front: 'en', back: 'zh' },
    cards: [],
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

// Fresh DB per test so tests are independent. We close the previous storage's DB
// connection first so deleteDatabase doesn't block on open connections.
async function freshStorage(previous: IndexedDBStorage | null): Promise<IndexedDBStorage> {
  if (previous) await previous.close()
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('english-app')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('deleteDatabase blocked'))
  })
  const storage = new IndexedDBStorage()
  await storage.ready()
  return storage
}

describe('IndexedDBStorage — decks', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('listDecks returns empty on a fresh DB', async () => {
    expect(await storage.listDecks()).toEqual([])
  })

  it('saveDeck then getDeck returns the saved deck', async () => {
    const deck = makeDeck({ id: 'x' })
    await storage.saveDeck(deck)
    expect(await storage.getDeck('x')).toEqual(deck)
  })

  it('saveDeck upserts on same id', async () => {
    await storage.saveDeck(makeDeck({ id: 'x', name: 'One' }))
    await storage.saveDeck(makeDeck({ id: 'x', name: 'Two' }))
    const loaded = await storage.getDeck('x')
    expect(loaded?.name).toBe('Two')
  })

  it('listDecks returns all saved decks', async () => {
    await storage.saveDeck(makeDeck({ id: 'a' }))
    await storage.saveDeck(makeDeck({ id: 'b' }))
    const list = await storage.listDecks()
    expect(list.map(d => d.id).sort()).toEqual(['a', 'b'])
  })

  it('deleteDeck removes it', async () => {
    await storage.saveDeck(makeDeck({ id: 'x' }))
    await storage.deleteDeck('x')
    expect(await storage.getDeck('x')).toBeNull()
  })

  it('getDeck returns null for unknown id', async () => {
    expect(await storage.getDeck('nope')).toBeNull()
  })
})
