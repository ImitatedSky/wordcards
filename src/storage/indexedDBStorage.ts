import { openDB, type IDBPDatabase } from 'idb'
import type { Deck } from '@/types/deck'
import type { Quiz } from '@/types/quiz'
import type { Tag } from '@/types/tag'
import type { ExportBundle, VocabDeckExport, GrammarQuizExport } from '@/types/import-export'
import type { IStorage } from './IStorage'

const DB_NAME = 'english-app'
const DB_VERSION = 1
const STORE_DECKS = 'decks'
const STORE_QUIZZES = 'quizzes'
const STORE_TAGS = 'tags'
const STORE_META = 'meta'

export class IndexedDBStorage implements IStorage {
  private dbPromise: Promise<IDBPDatabase>

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_DECKS)) {
          db.createObjectStore(STORE_DECKS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_QUIZZES)) {
          db.createObjectStore(STORE_QUIZZES, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_TAGS)) {
          db.createObjectStore(STORE_TAGS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' })
        }
      },
    })
  }

  async ready(): Promise<void> {
    await this.dbPromise
  }

  async close(): Promise<void> {
    const db = await this.dbPromise
    db.close()
  }

  // ---------- Decks ----------
  async listDecks(): Promise<Deck[]> {
    const db = await this.dbPromise
    return db.getAll(STORE_DECKS)
  }

  async getDeck(id: string): Promise<Deck | null> {
    const db = await this.dbPromise
    const deck = await db.get(STORE_DECKS, id)
    return deck ?? null
  }

  async saveDeck(deck: Deck): Promise<void> {
    const db = await this.dbPromise
    await db.put(STORE_DECKS, deck)
  }

  async deleteDeck(id: string): Promise<void> {
    const db = await this.dbPromise
    await db.delete(STORE_DECKS, id)
  }

  // ---------- Quizzes ----------
  async listQuizzes(): Promise<Quiz[]> {
    const db = await this.dbPromise
    return db.getAll(STORE_QUIZZES)
  }

  async getQuiz(id: string): Promise<Quiz | null> {
    const db = await this.dbPromise
    const quiz = await db.get(STORE_QUIZZES, id)
    return quiz ?? null
  }

  async saveQuiz(quiz: Quiz): Promise<void> {
    const db = await this.dbPromise
    await db.put(STORE_QUIZZES, quiz)
  }

  async deleteQuiz(id: string): Promise<void> {
    const db = await this.dbPromise
    await db.delete(STORE_QUIZZES, id)
  }

  // ---------- Tags ----------
  async listTags(): Promise<Tag[]> {
    const db = await this.dbPromise
    return db.getAll(STORE_TAGS)
  }

  async getTag(id: string): Promise<Tag | null> {
    const db = await this.dbPromise
    const tag = await db.get(STORE_TAGS, id)
    return tag ?? null
  }

  async saveTag(tag: Tag): Promise<void> {
    const db = await this.dbPromise
    await db.put(STORE_TAGS, tag)
  }

  async deleteTag(id: string): Promise<void> {
    const db = await this.dbPromise
    const tag = await db.get(STORE_TAGS, id)
    if (tag?.builtIn) {
      throw new Error(`Cannot delete built-in tag: ${id}`)
    }

    const tx = db.transaction([STORE_TAGS, STORE_DECKS, STORE_QUIZZES], 'readwrite')
    await tx.objectStore(STORE_TAGS).delete(id)

    const deckStore = tx.objectStore(STORE_DECKS)
    const decks = await deckStore.getAll()
    for (const deck of decks as Deck[]) {
      const filteredDeckTags = deck.tags.filter(t => t !== id)
      const filteredCards = deck.cards.map(c => ({ ...c, tags: c.tags.filter(t => t !== id) }))
      if (
        filteredDeckTags.length !== deck.tags.length ||
        filteredCards.some((c, i) => c.tags.length !== deck.cards[i].tags.length)
      ) {
        await deckStore.put({ ...deck, tags: filteredDeckTags, cards: filteredCards })
      }
    }

    const quizStore = tx.objectStore(STORE_QUIZZES)
    const quizzes = await quizStore.getAll()
    for (const quiz of quizzes as Quiz[]) {
      const filteredQuizTags = quiz.tags.filter(t => t !== id)
      const filteredQuestions = quiz.questions.map(q => ({ ...q, tags: q.tags.filter(t => t !== id) }))
      if (
        filteredQuizTags.length !== quiz.tags.length ||
        filteredQuestions.some((q, i) => q.tags.length !== quiz.questions[i].tags.length)
      ) {
        await quizStore.put({ ...quiz, tags: filteredQuizTags, questions: filteredQuestions })
      }
    }

    await tx.done
  }

  // ---------- Meta ----------
  async getMeta<T = unknown>(key: string): Promise<T | null> {
    const db = await this.dbPromise
    const row = await db.get(STORE_META, key)
    return (row?.value ?? null) as T | null
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    const db = await this.dbPromise
    await db.put(STORE_META, { key, value })
  }

  // ---------- Bulk / import / export ----------
  async exportAll(): Promise<ExportBundle> {
    const [decks, quizzes, tags] = await Promise.all([
      this.listDecks(),
      this.listQuizzes(),
      this.listTags(),
    ])
    return {
      format: 'english-app-export-all',
      version: 1,
      decks,
      quizzes,
      tags,
    }
  }

  async importDeck(bundle: VocabDeckExport): Promise<Deck> {
    // Full import (including tag remapping) is implemented in the import/export plan.
    // For now provide a minimal save so the interface is satisfied.
    await this.saveDeck(bundle.data)
    return bundle.data
  }

  async importQuiz(bundle: GrammarQuizExport): Promise<Quiz> {
    await this.saveQuiz(bundle.data)
    return bundle.data
  }
}
