import type {
  FillInBlankQuestion,
  MultipleChoiceQuestion,
  Quiz,
} from '@/types/quiz'
import { DEFAULT_QUIZ_LANGUAGE } from '@/types/quiz'
import { newId } from '@/utils/uuid'

type NewMcInput = {
  prompt: string
  options: string[]
  correctIndex: number
  explanation?: string
  notes?: string
  tags?: string[]
}

export function newMcQuestion(input: NewMcInput): MultipleChoiceQuestion {
  return {
    id: newId(),
    type: 'multiple_choice',
    prompt: input.prompt,
    options: input.options,
    correctIndex: input.correctIndex,
    explanation: input.explanation,
    notes: input.notes,
    tags: input.tags ?? [],
    stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
  }
}

type NewFibInput = {
  prompt: string
  answers: string[]
  caseSensitive?: boolean
  explanation?: string
  notes?: string
  tags?: string[]
}

export function newFibQuestion(input: NewFibInput): FillInBlankQuestion {
  return {
    id: newId(),
    type: 'fill_in_blank',
    prompt: input.prompt,
    answers: input.answers,
    caseSensitive: input.caseSensitive,
    explanation: input.explanation,
    notes: input.notes,
    tags: input.tags ?? [],
    stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
  }
}

type NewQuizInput = {
  name: string
  description?: string
  language?: Quiz['language']
  tags?: string[]
}

export function newQuiz(input: NewQuizInput): Quiz {
  const now = Date.now()
  return {
    id: newId(),
    name: input.name,
    description: input.description,
    language: input.language ?? DEFAULT_QUIZ_LANGUAGE,
    questions: [],
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }
}
