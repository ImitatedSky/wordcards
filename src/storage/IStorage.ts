import type { Deck } from '@/types/deck'
import type { Quiz } from '@/types/quiz'
import type { Tag } from '@/types/tag'
import type { ExportBundle, VocabDeckExport, GrammarQuizExport } from '@/types/import-export'

export interface IStorage {
  // Decks
  listDecks(): Promise<Deck[]>
  getDeck(id: string): Promise<Deck | null>
  saveDeck(deck: Deck): Promise<void>
  deleteDeck(id: string): Promise<void>

  // Quizzes
  listQuizzes(): Promise<Quiz[]>
  getQuiz(id: string): Promise<Quiz | null>
  saveQuiz(quiz: Quiz): Promise<void>
  deleteQuiz(id: string): Promise<void>

  // Tags
  listTags(): Promise<Tag[]>
  getTag(id: string): Promise<Tag | null>
  saveTag(tag: Tag): Promise<void>
  deleteTag(id: string): Promise<void>

  // Bulk / import / export
  exportAll(): Promise<ExportBundle>
  importDeck(bundle: VocabDeckExport): Promise<Deck>
  importQuiz(bundle: GrammarQuizExport): Promise<Quiz>

  // Meta
  getMeta<T = unknown>(key: string): Promise<T | null>
  setMeta(key: string, value: unknown): Promise<void>
}
