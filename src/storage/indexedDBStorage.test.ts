import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IndexedDBStorage } from './indexedDBStorage'
import type { Deck } from '@/types/deck'
import type { Quiz } from '@/types/quiz'
import type { Tag } from '@/types/tag'

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

function makeQuiz(overrides: Partial<Quiz> = {}): Quiz {
  return {
    id: 'q1',
    name: 'Test Quiz',
    language: 'en',
    questions: [],
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 't1',
    name: 'Tag',
    builtIn: false,
    createdAt: 1,
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

describe('IndexedDBStorage — quizzes', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('saveQuiz + getQuiz roundtrip', async () => {
    const quiz = makeQuiz({ id: 'qz' })
    await storage.saveQuiz(quiz)
    expect(await storage.getQuiz('qz')).toEqual(quiz)
  })

  it('deleteQuiz removes it', async () => {
    await storage.saveQuiz(makeQuiz({ id: 'qz' }))
    await storage.deleteQuiz('qz')
    expect(await storage.getQuiz('qz')).toBeNull()
  })
})

describe('IndexedDBStorage — tags', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('saveTag + listTags', async () => {
    await storage.saveTag(makeTag({ id: 't1', name: 'TOEIC' }))
    await storage.saveTag(makeTag({ id: 't2', name: 'Business' }))
    const tags = await storage.listTags()
    expect(tags.map(t => t.id).sort()).toEqual(['t1', 't2'])
  })

  it('deleteTag refuses built-in tags', async () => {
    await storage.saveTag(makeTag({ id: 'builtin-favorite', builtIn: true }))
    await expect(storage.deleteTag('builtin-favorite')).rejects.toThrow(/built-in/)
  })

  it('deleteTag cascades: removes tag id from decks and cards', async () => {
    await storage.saveTag(makeTag({ id: 't1' }))
    await storage.saveDeck({
      id: 'd1',
      name: 'D',
      language: { front: 'en', back: 'zh' },
      tags: ['t1', 't2'],
      cards: [
        {
          id: 'c1',
          front: 'a',
          back: 'b',
          tags: ['t1'],
          stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
        },
      ],
      createdAt: 1,
      updatedAt: 1,
    })
    await storage.deleteTag('t1')
    const deck = await storage.getDeck('d1')
    expect(deck?.tags).toEqual(['t2'])
    expect(deck?.cards[0].tags).toEqual([])
  })

  it('deleteTag cascades: removes tag id from quizzes and questions', async () => {
    await storage.saveTag(makeTag({ id: 't1' }))
    await storage.saveQuiz({
      id: 'q1',
      name: 'Q',
      language: 'en',
      tags: ['t1'],
      questions: [
        {
          id: 'qu1',
          type: 'multiple_choice',
          prompt: 'p',
          options: ['a', 'b'],
          correctIndex: 0,
          tags: ['t1'],
          stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
        },
      ],
      createdAt: 1,
      updatedAt: 1,
    })
    await storage.deleteTag('t1')
    const quiz = await storage.getQuiz('q1')
    expect(quiz?.tags).toEqual([])
    expect(quiz?.questions[0].tags).toEqual([])
  })
})

describe('IndexedDBStorage — meta', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('getMeta returns null for unknown keys', async () => {
    expect(await storage.getMeta('none')).toBeNull()
  })

  it('setMeta then getMeta roundtrip', async () => {
    await storage.setMeta('firstRunCompleted', true)
    expect(await storage.getMeta<boolean>('firstRunCompleted')).toBe(true)
  })
})

describe('IndexedDBStorage — exportAll', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('bundles decks, quizzes, and tags', async () => {
    await storage.saveDeck(makeDeck({ id: 'd1' }))
    await storage.saveQuiz(makeQuiz({ id: 'q1' }))
    await storage.saveTag(makeTag({ id: 't1' }))
    const bundle = await storage.exportAll()
    expect(bundle.format).toBe('english-app-export-all')
    expect(bundle.version).toBe(1)
    expect(bundle.decks.map(d => d.id)).toEqual(['d1'])
    expect(bundle.quizzes.map(q => q.id)).toEqual(['q1'])
    expect(bundle.tags.map(t => t.id)).toEqual(['t1'])
  })
})
