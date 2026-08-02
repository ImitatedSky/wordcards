import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IndexedDBStorage } from './indexedDBStorage'
import {
  seedDefaultLibrary,
  mergeDefaultDeck,
  type DefaultLibraryManifest,
  type LoadJson,
} from './defaultLibrarySeed'
import type { Card, Deck } from '@/types/deck'
import type { VocabDeckExport } from '@/types/import-export'

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

const initialStats = { correctCount: 0, incorrectCount: 0, lastReviewedAt: null }

function card(deckId: string, word: string, back: string): Card {
  return {
    id: `${deckId}:${word.toLowerCase()}`,
    front: `${word} (n.)`,
    back,
    tags: [],
    stats: { ...initialStats },
  }
}

function bundle(deckId: string, name: string, cards: Card[]): VocabDeckExport {
  return {
    format: 'english-app-vocab-deck',
    version: 1,
    data: {
      id: deckId,
      name,
      description: '內建字庫',
      language: { front: 'en', back: 'zh' },
      cards,
      tags: [],
      createdAt: 0,
      updatedAt: 0,
    },
    tags: [],
  }
}

/** 以 in-memory 檔案表建立注入用 loader,並記錄每個檔案被抓的次數。 */
function makeLoader(version: string, bundles: VocabDeckExport[]) {
  const manifest: DefaultLibraryManifest = {
    format: 'english-app-default-library',
    version,
    decks: bundles.map((b, i) => ({
      id: b.data.id,
      file: `deck-${i}.json`,
      name: b.data.name,
      cardCount: b.data.cards.length,
    })),
  }
  const files = new Map<string, unknown>([['manifest.json', manifest]])
  bundles.forEach((b, i) => files.set(`deck-${i}.json`, b))
  const calls: string[] = []
  const load: LoadJson = async (file) => {
    calls.push(file)
    if (!files.has(file)) throw new Error(`missing ${file}`)
    return files.get(file)
  }
  return { load, calls }
}

describe('seedDefaultLibrary', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('seeds all manifest decks on first run and stamps real timestamps', async () => {
    const { load } = makeLoader('v1', [
      bundle('default-lv1', '高中7000 LV1', [card('default-lv1', 'apple', '蘋果')]),
      bundle('default-toeic-1000', '多益常用1000', [card('default-toeic-1000', 'invoice', '發票')]),
    ])
    await seedDefaultLibrary(storage, load)

    const decks = await storage.listDecks()
    expect(decks.map((d) => d.id).sort()).toEqual(['default-lv1', 'default-toeic-1000'])
    expect(decks[0].createdAt).toBeGreaterThan(0)
    expect(await storage.getMeta<string>('defaultLibrary.version')).toBe('v1')
    expect(await storage.getMeta<string[]>('defaultLibrary.seededDecks')).toEqual(
      expect.arrayContaining(['default-lv1', 'default-toeic-1000']),
    )
  })

  it('does nothing when the stored version matches the manifest', async () => {
    const { load } = makeLoader('v1', [
      bundle('default-lv1', '高中7000 LV1', [card('default-lv1', 'apple', '蘋果')]),
    ])
    await seedDefaultLibrary(storage, load)

    const { load: load2, calls } = makeLoader('v1', [
      bundle('default-lv1', '高中7000 LV1', [card('default-lv1', 'apple', '蘋果！')]),
    ])
    await seedDefaultLibrary(storage, load2)

    expect(calls).toEqual(['manifest.json']) // 沒抓任何牌組檔
    expect((await storage.getDeck('default-lv1'))!.cards[0].back).toBe('蘋果')
  })

  it('upgrade keeps user tags/stats but takes new content fields', async () => {
    const { load } = makeLoader('v1', [
      bundle('default-lv1', '高中7000 LV1', [card('default-lv1', 'apple', '蘋果')]),
    ])
    await seedDefaultLibrary(storage, load)

    // 使用者標記 + 練習過
    const deck = (await storage.getDeck('default-lv1'))!
    deck.cards[0].tags = ['builtin-favorite']
    deck.cards[0].stats = { correctCount: 3, incorrectCount: 1, lastReviewedAt: 123 }
    await storage.saveDeck(deck)

    const { load: load2 } = makeLoader('v2', [
      bundle('default-lv1', '高中7000 LV1', [card('default-lv1', 'apple', '蘋果（新解釋）')]),
    ])
    await seedDefaultLibrary(storage, load2)

    const upgraded = (await storage.getDeck('default-lv1'))!.cards[0]
    expect(upgraded.back).toBe('蘋果（新解釋）')
    expect(upgraded.tags).toEqual(['builtin-favorite'])
    expect(upgraded.stats.correctCount).toBe(3)
    expect(await storage.getMeta<string>('defaultLibrary.version')).toBe('v2')
  })

  it('does not resurrect a default deck the user deleted', async () => {
    const { load } = makeLoader('v1', [
      bundle('default-lv1', '高中7000 LV1', [card('default-lv1', 'apple', '蘋果')]),
    ])
    await seedDefaultLibrary(storage, load)
    await storage.deleteDeck('default-lv1')

    const { load: load2 } = makeLoader('v2', [
      bundle('default-lv1', '高中7000 LV1', [card('default-lv1', 'apple', '蘋果')]),
    ])
    await seedDefaultLibrary(storage, load2)

    expect(await storage.getDeck('default-lv1')).toBeNull()
    expect(await storage.getMeta<string>('defaultLibrary.version')).toBe('v2')
  })

  it('inserts a deck first added in a newer library version', async () => {
    const { load } = makeLoader('v1', [
      bundle('default-lv1', '高中7000 LV1', [card('default-lv1', 'apple', '蘋果')]),
    ])
    await seedDefaultLibrary(storage, load)

    const { load: load2 } = makeLoader('v2', [
      bundle('default-lv1', '高中7000 LV1', [card('default-lv1', 'apple', '蘋果')]),
      bundle('default-lv2', '高中7000 LV2', [card('default-lv2', 'run', '跑')]),
    ])
    await seedDefaultLibrary(storage, load2)

    expect(await storage.getDeck('default-lv2')).not.toBeNull()
  })

  it('boot survives a failing loader and retries on the next run', async () => {
    const failing: LoadJson = async () => {
      throw new Error('offline')
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(seedDefaultLibrary(storage, failing)).resolves.toBeUndefined()
    warn.mockRestore()
    expect(await storage.getMeta<string>('defaultLibrary.version')).toBeNull()
    expect(await storage.listDecks()).toEqual([])

    const { load } = makeLoader('v1', [
      bundle('default-lv1', '高中7000 LV1', [card('default-lv1', 'apple', '蘋果')]),
    ])
    await seedDefaultLibrary(storage, load)
    expect(await storage.getDeck('default-lv1')).not.toBeNull()
  })
})

describe('mergeDefaultDeck', () => {
  const base = (cards: Card[]): Deck => ({
    id: 'default-lv1',
    name: '高中7000 LV1',
    language: { front: 'en', back: 'zh' },
    cards,
    tags: [],
    createdAt: 1,
    updatedAt: 1,
  })

  it('removes untouched cards dropped by the new version', () => {
    const existing = base([card('default-lv1', 'apple', '蘋果'), card('default-lv1', 'old', '舊')])
    const incoming = base([card('default-lv1', 'apple', '蘋果')])
    const merged = mergeDefaultDeck(existing, incoming)
    expect(merged.cards.map((c) => c.id)).toEqual(['default-lv1:apple'])
  })

  it('keeps dropped cards the user has touched', () => {
    const touched = { ...card('default-lv1', 'old', '舊'), tags: ['builtin-star'] }
    const existing = base([card('default-lv1', 'apple', '蘋果'), touched])
    const incoming = base([card('default-lv1', 'apple', '蘋果')])
    const merged = mergeDefaultDeck(existing, incoming)
    expect(merged.cards.map((c) => c.id)).toContain('default-lv1:old')
  })

  it('always keeps user-added cards (no deck-id prefix)', () => {
    const userCard: Card = { ...card('default-lv1', 'x', 'x'), id: 'uuid-1234' }
    const existing = base([card('default-lv1', 'apple', '蘋果'), userCard])
    const incoming = base([card('default-lv1', 'apple', '蘋果')])
    const merged = mergeDefaultDeck(existing, incoming)
    expect(merged.cards.map((c) => c.id)).toContain('uuid-1234')
  })

  it('preserves deck-level name/description/tags the user may have edited', () => {
    const existing = { ...base([card('default-lv1', 'apple', '蘋果')]), name: '我的改名' }
    const incoming = base([card('default-lv1', 'apple', '蘋果')])
    expect(mergeDefaultDeck(existing, incoming).name).toBe('我的改名')
  })
})
