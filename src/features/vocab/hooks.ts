import { useCallback, useEffect, useState } from 'react'
import type { Deck } from '@/types/deck'
import { useStorage } from '@/storage/useStorage'
import { newDeck } from './factories'

export function useDecks() {
  const storage = useStorage()
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await storage.listDecks()
    setDecks(list.sort((a, b) => b.updatedAt - a.updatedAt))
    setLoading(false)
  }, [storage])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createDeck = useCallback(
    async (input: { name: string; description?: string }) => {
      const deck = newDeck(input)
      await storage.saveDeck(deck)
      await refresh()
      return deck
    },
    [storage, refresh],
  )

  const renameDeck = useCallback(
    async (id: string, name: string) => {
      const existing = await storage.getDeck(id)
      if (!existing) throw new Error(`Deck not found: ${id}`)
      await storage.saveDeck({ ...existing, name, updatedAt: Date.now() })
      await refresh()
    },
    [storage, refresh],
  )

  const deleteDeck = useCallback(
    async (id: string) => {
      await storage.deleteDeck(id)
      await refresh()
    },
    [storage, refresh],
  )

  return { decks, loading, createDeck, renameDeck, deleteDeck, refresh }
}
