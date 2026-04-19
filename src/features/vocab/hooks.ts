import { useCallback, useEffect, useState } from 'react'
import type { Deck, Card } from '@/types/deck'
import { useStorage } from '@/storage/useStorage'
import { newDeck, newCard } from './factories'

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

export function useDeck(deckId: string | undefined) {
  const storage = useStorage()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!deckId) {
      setDeck(null)
      setLoading(false)
      return
    }
    const d = await storage.getDeck(deckId)
    setDeck(d)
    setLoading(false)
  }, [storage, deckId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const persist = useCallback(
    async (updater: (d: Deck) => Deck) => {
      if (!deckId) throw new Error('No deckId')
      const current = await storage.getDeck(deckId)
      if (!current) throw new Error(`Deck not found: ${deckId}`)
      const next = { ...updater(current), updatedAt: Date.now() }
      await storage.saveDeck(next)
      await refresh()
      return next
    },
    [storage, deckId, refresh],
  )

  const addCard = useCallback(
    async (input: Parameters<typeof newCard>[0]) => {
      const card = newCard(input)
      await persist((d) => ({ ...d, cards: [...d.cards, card] }))
      return card
    },
    [persist],
  )

  const updateCard = useCallback(
    async (cardId: string, patch: Partial<Omit<Card, 'id' | 'stats'>>) => {
      await persist((d) => ({
        ...d,
        cards: d.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
      }))
    },
    [persist],
  )

  const deleteCard = useCallback(
    async (cardId: string) => {
      await persist((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== cardId) }))
    },
    [persist],
  )

  const toggleBuiltInTag = useCallback(
    async (cardId: string, builtinId: string) => {
      await persist((d) => ({
        ...d,
        cards: d.cards.map((c) => {
          if (c.id !== cardId) return c
          const has = c.tags.includes(builtinId)
          return { ...c, tags: has ? c.tags.filter((t) => t !== builtinId) : [...c.tags, builtinId] }
        }),
      }))
    },
    [persist],
  )

  return { deck, loading, addCard, updateCard, deleteCard, toggleBuiltInTag, refresh }
}
