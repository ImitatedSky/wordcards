import { describe, it, expect } from 'vitest'
import { newQuiz, newMcQuestion, newFibQuestion } from './factories'
import { DEFAULT_QUIZ_LANGUAGE } from '@/types/quiz'

describe('newMcQuestion', () => {
  it('creates an MC question with defaults and a fresh id', () => {
    const q = newMcQuestion({
      prompt: 'She ___ to school.',
      options: ['go', 'goes', 'going', 'gone'],
      correctIndex: 1,
    })
    expect(q.id).toMatch(/.+/)
    expect(q.type).toBe('multiple_choice')
    expect(q.options).toEqual(['go', 'goes', 'going', 'gone'])
    expect(q.correctIndex).toBe(1)
    expect(q.tags).toEqual([])
    expect(q.stats).toEqual({ correctCount: 0, incorrectCount: 0, lastReviewedAt: null })
  })

  it('produces distinct ids', () => {
    const a = newMcQuestion({ prompt: 'p', options: ['a', 'b'], correctIndex: 0 })
    const b = newMcQuestion({ prompt: 'p', options: ['a', 'b'], correctIndex: 0 })
    expect(a.id).not.toBe(b.id)
  })
})

describe('newFibQuestion', () => {
  it('creates a FIB question with defaults', () => {
    const q = newFibQuestion({ prompt: 'The color ___ red.', answers: ['is'] })
    expect(q.id).toMatch(/.+/)
    expect(q.type).toBe('fill_in_blank')
    expect(q.answers).toEqual(['is'])
    expect(q.caseSensitive).toBeUndefined()
    expect(q.tags).toEqual([])
    expect(q.stats).toEqual({ correctCount: 0, incorrectCount: 0, lastReviewedAt: null })
  })

  it('passes caseSensitive through when provided', () => {
    const q = newFibQuestion({ prompt: 'x', answers: ['y'], caseSensitive: true })
    expect(q.caseSensitive).toBe(true)
  })
})

describe('newQuiz', () => {
  it('creates a quiz with defaults', () => {
    const quiz = newQuiz({ name: 'Present Simple' })
    expect(quiz.id).toMatch(/.+/)
    expect(quiz.name).toBe('Present Simple')
    expect(quiz.language).toBe(DEFAULT_QUIZ_LANGUAGE)
    expect(quiz.questions).toEqual([])
    expect(quiz.tags).toEqual([])
    expect(quiz.createdAt).toBeGreaterThan(0)
    expect(quiz.updatedAt).toBe(quiz.createdAt)
  })
})
