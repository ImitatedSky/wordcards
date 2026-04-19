import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { useDecks, useDeck } from './hooks'
import { BUILTIN_FAVORITE_ID } from '@/types/tag'
import { newDeck as makeDeck } from './factories'

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

describe('useDecks', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('starts empty and creates a deck', async () => {
    const { result } = renderHook(() => useDecks(), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.decks).toEqual([])

    let created: Awaited<ReturnType<typeof result.current.createDeck>> | undefined
    await act(async () => {
      created = await result.current.createDeck({ name: 'Deck A' })
    })
    expect(created?.name).toBe('Deck A')
    expect(result.current.decks).toHaveLength(1)
    expect(result.current.decks[0].name).toBe('Deck A')
  })

  it('renames a deck', async () => {
    const { result } = renderHook(() => useDecks(), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let id = ''
    await act(async () => {
      const d = await result.current.createDeck({ name: 'Old' })
      id = d.id
    })
    await act(async () => {
      await result.current.renameDeck(id, 'New')
    })
    expect(result.current.decks[0].name).toBe('New')
  })

  it('deletes a deck', async () => {
    const { result } = renderHook(() => useDecks(), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let id = ''
    await act(async () => {
      const d = await result.current.createDeck({ name: 'Doomed' })
      id = d.id
    })
    expect(result.current.decks).toHaveLength(1)
    await act(async () => {
      await result.current.deleteDeck(id)
    })
    expect(result.current.decks).toHaveLength(0)
  })
})

describe('useDeck', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  async function seedDeck() {
    const d = makeDeck({ name: 'Seed' })
    await storage.saveDeck(d)
    return d.id
  }

  it('loads a deck by id', async () => {
    const id = await seedDeck()
    const { result } = renderHook(() => useDeck(id), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.deck).not.toBeNull())
    expect(result.current.deck?.name).toBe('Seed')
    expect(result.current.deck?.cards).toHaveLength(0)
  })

  it('adds, updates, and deletes a card', async () => {
    const id = await seedDeck()
    const { result } = renderHook(() => useDeck(id), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.deck).not.toBeNull())

    let cardId = ''
    await act(async () => {
      const c = await result.current.addCard({ front: 'hello', back: '你好' })
      cardId = c.id
    })
    expect(result.current.deck?.cards).toHaveLength(1)

    await act(async () => {
      await result.current.updateCard(cardId, { front: 'hi' })
    })
    expect(result.current.deck?.cards[0].front).toBe('hi')

    await act(async () => {
      await result.current.deleteCard(cardId)
    })
    expect(result.current.deck?.cards).toHaveLength(0)
  })

  it('toggles a built-in tag on a card', async () => {
    const id = await seedDeck()
    const { result } = renderHook(() => useDeck(id), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.deck).not.toBeNull())
    let cardId = ''
    await act(async () => {
      const c = await result.current.addCard({ front: 'a', back: 'b' })
      cardId = c.id
    })
    await act(async () => {
      await result.current.toggleBuiltInTag(cardId, BUILTIN_FAVORITE_ID)
    })
    expect(result.current.deck?.cards[0].tags).toContain(BUILTIN_FAVORITE_ID)
    await act(async () => {
      await result.current.toggleBuiltInTag(cardId, BUILTIN_FAVORITE_ID)
    })
    expect(result.current.deck?.cards[0].tags).not.toContain(BUILTIN_FAVORITE_ID)
  })

  it('bumps deck.updatedAt on card mutation', async () => {
    const id = await seedDeck()
    const { result } = renderHook(() => useDeck(id), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.deck).not.toBeNull())
    const before = result.current.deck!.updatedAt
    await new Promise((r) => setTimeout(r, 5))
    await act(async () => {
      await result.current.addCard({ front: 'x', back: 'y' })
    })
    expect(result.current.deck!.updatedAt).toBeGreaterThan(before)
  })
})
