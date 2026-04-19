import type { Deck } from './deck'
import type { Quiz } from './quiz'
import type { Tag } from './tag'

export type VocabDeckExport = {
  format: 'english-app-vocab-deck'
  version: 1
  data: Deck
  tags: Tag[]
}

export type GrammarQuizExport = {
  format: 'english-app-grammar-quiz'
  version: 1
  data: Quiz
  tags: Tag[]
}

export type ExportBundle = {
  format: 'english-app-export-all'
  version: 1
  decks: Deck[]
  quizzes: Quiz[]
  tags: Tag[]
}
