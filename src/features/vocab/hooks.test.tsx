import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { useDecks } from './hooks'

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
