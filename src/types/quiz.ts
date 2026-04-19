import type { LanguageCode } from './deck'

export type QuestionStats = {
  correctCount: number
  incorrectCount: number
  lastReviewedAt: number | null
}

export type BaseQuestion = {
  id: string
  prompt: string
  explanation?: string
  notes?: string
  tags: string[]
  stats: QuestionStats
}

export type MultipleChoiceQuestion = BaseQuestion & {
  type: 'multiple_choice'
  options: string[]
  correctIndex: number
}

export type FillInBlankQuestion = BaseQuestion & {
  type: 'fill_in_blank'
  answers: string[]
  caseSensitive?: boolean
}

export type Question = MultipleChoiceQuestion | FillInBlankQuestion

export type Quiz = {
  id: string
  name: string
  description?: string
  language: LanguageCode
  questions: Question[]
  tags: string[]
  createdAt: number
  updatedAt: number
}

export const DEFAULT_QUIZ_LANGUAGE: LanguageCode = 'en'
