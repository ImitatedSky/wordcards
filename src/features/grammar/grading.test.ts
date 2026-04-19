import { describe, it, expect } from 'vitest'
import { gradeAnswer, type AnswerInput } from './grading'
import { newMcQuestion, newFibQuestion } from './factories'

describe('gradeAnswer — multiple choice', () => {
  const mc = newMcQuestion({
    prompt: 'p',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 2,
  })

  it('is correct when optionIndex matches correctIndex', () => {
    expect(gradeAnswer(mc, { kind: 'mc', optionIndex: 2 })).toBe('correct')
  })

  it('is incorrect when optionIndex does not match', () => {
    expect(gradeAnswer(mc, { kind: 'mc', optionIndex: 0 })).toBe('incorrect')
  })

  it('is incorrect when the answer shape is FIB', () => {
    const wrong: AnswerInput = { kind: 'fib', text: 'c' }
    expect(gradeAnswer(mc, wrong)).toBe('incorrect')
  })
})

describe('gradeAnswer — fill in blank (case-insensitive default)', () => {
  const fib = newFibQuestion({ prompt: 'The sky ___ blue.', answers: ['is', 'looks'] })

  it('accepts any listed answer', () => {
    expect(gradeAnswer(fib, { kind: 'fib', text: 'is' })).toBe('correct')
    expect(gradeAnswer(fib, { kind: 'fib', text: 'looks' })).toBe('correct')
  })

  it('trims leading and trailing whitespace on input', () => {
    expect(gradeAnswer(fib, { kind: 'fib', text: '  is  ' })).toBe('correct')
  })

  it('is case-insensitive by default', () => {
    expect(gradeAnswer(fib, { kind: 'fib', text: 'IS' })).toBe('correct')
    expect(gradeAnswer(fib, { kind: 'fib', text: 'Looks' })).toBe('correct')
  })

  it('rejects non-matching text', () => {
    expect(gradeAnswer(fib, { kind: 'fib', text: 'was' })).toBe('incorrect')
  })

  it('rejects empty input', () => {
    expect(gradeAnswer(fib, { kind: 'fib', text: '' })).toBe('incorrect')
    expect(gradeAnswer(fib, { kind: 'fib', text: '   ' })).toBe('incorrect')
  })
})

describe('gradeAnswer — fill in blank (case-sensitive)', () => {
  const fib = newFibQuestion({
    prompt: 'Proper noun ___',
    answers: ['Paris'],
    caseSensitive: true,
  })

  it('accepts exact case match', () => {
    expect(gradeAnswer(fib, { kind: 'fib', text: 'Paris' })).toBe('correct')
  })

  it('rejects mismatched case', () => {
    expect(gradeAnswer(fib, { kind: 'fib', text: 'paris' })).toBe('incorrect')
    expect(gradeAnswer(fib, { kind: 'fib', text: 'PARIS' })).toBe('incorrect')
  })
})
