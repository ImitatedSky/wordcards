import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { useQuizSession } from './useQuizSession'
import { newQuiz, newMcQuestion, newFibQuestion } from '../factories'

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

function wrapper(storage: IndexedDBStorage) {
  return ({ children }: { children: ReactNode }) => (
    <StorageProvider storage={storage}>{children}</StorageProvider>
  )
}

describe('useQuizSession', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  async function seedMixedQuiz() {
    const quiz = newQuiz({ name: 'Mixed' })
    quiz.questions = [
      newMcQuestion({ prompt: 'mc1', options: ['a', 'b'], correctIndex: 1 }),
      newFibQuestion({ prompt: 'fib1', answers: ['hello'] }),
    ]
    await storage.saveQuiz(quiz)
    return quiz
  }

  it('loads a quiz and runs through both types to finished', async () => {
    const quiz = await seedMixedQuiz()
    const { result } = renderHook(
      () => useQuizSession(quiz.id, { shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    expect(result.current.state.queue).toEqual(quiz.questions.map((q) => q.id))

    await act(async () => result.current.submit({ kind: 'mc', optionIndex: 1 }))
    expect(result.current.state.phase).toBe('revealed')
    expect(result.current.state.lastGrade).toBe('correct')

    await act(async () => result.current.next())
    expect(result.current.state.phase).toBe('prompting')
    expect(result.current.state.index).toBe(1)

    await act(async () => result.current.submit({ kind: 'fib', text: 'HELLO' }))
    expect(result.current.state.lastGrade).toBe('correct')

    await act(async () => result.current.next())
    expect(result.current.state.phase).toBe('finished')
  })

  it('persists stats to storage after each answer', async () => {
    const quiz = await seedMixedQuiz()
    const mcId = quiz.questions[0].id
    const { result } = renderHook(
      () => useQuizSession(quiz.id, { shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    await act(async () => result.current.submit({ kind: 'mc', optionIndex: 0 }))

    const saved = await storage.getQuiz(quiz.id)
    const q = saved!.questions.find((item) => item.id === mcId)!
    expect(q.stats.incorrectCount).toBe(1)
    expect(q.stats.lastReviewedAt).not.toBeNull()
  })

  it('reviewIncorrect rebuilds queue from incorrect answers only', async () => {
    const quiz = await seedMixedQuiz()
    const { result } = renderHook(
      () => useQuizSession(quiz.id, { shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    await act(async () => result.current.submit({ kind: 'mc', optionIndex: 0 }))
    await act(async () => result.current.next())
    await act(async () => result.current.submit({ kind: 'fib', text: 'hello' }))
    await act(async () => result.current.next())
    expect(result.current.state.phase).toBe('finished')

    await act(async () => result.current.reviewIncorrect())
    expect(result.current.state.phase).toBe('prompting')
    expect(result.current.state.queue).toEqual([quiz.questions[0].id])
    expect(result.current.state.answers).toEqual({})
  })

  it('empty quiz finishes immediately', async () => {
    const quiz = newQuiz({ name: 'Empty' })
    await storage.saveQuiz(quiz)
    const { result } = renderHook(
      () => useQuizSession(quiz.id, { shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('finished'))
    expect(result.current.state.queue).toEqual([])
  })

  it('ignores mismatched answer shape without writing', async () => {
    const quiz = await seedMixedQuiz()
    const { result } = renderHook(
      () => useQuizSession(quiz.id, { shuffle: false }),
      { wrapper: wrapper(storage) },
    )
    await waitFor(() => expect(result.current.state.phase).toBe('prompting'))
    await act(async () => result.current.submit({ kind: 'fib', text: 'anything' }))
    expect(result.current.state.phase).toBe('prompting')
    expect(result.current.state.lastGrade).toBeUndefined()
  })
})
