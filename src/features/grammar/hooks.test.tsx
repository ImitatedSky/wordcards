import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { useQuizzes, useQuiz } from './hooks'
import { BUILTIN_FAVORITE_ID } from '@/types/tag'
import { newQuiz as makeQuiz, newMcQuestion, newFibQuestion } from './factories'

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

describe('useQuizzes', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('starts empty and creates a quiz', async () => {
    const { result } = renderHook(() => useQuizzes(), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.quizzes).toEqual([])

    let created: Awaited<ReturnType<typeof result.current.createQuiz>> | undefined
    await act(async () => {
      created = await result.current.createQuiz({ name: 'Quiz A' })
    })
    expect(created?.name).toBe('Quiz A')
    expect(result.current.quizzes).toHaveLength(1)
    expect(result.current.quizzes[0].name).toBe('Quiz A')
  })

  it('renames a quiz', async () => {
    const { result } = renderHook(() => useQuizzes(), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let id = ''
    await act(async () => {
      const q = await result.current.createQuiz({ name: 'Old' })
      id = q.id
    })
    await act(async () => {
      await result.current.renameQuiz(id, 'New')
    })
    expect(result.current.quizzes[0].name).toBe('New')
  })

  it('deletes a quiz', async () => {
    const { result } = renderHook(() => useQuizzes(), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let id = ''
    await act(async () => {
      const q = await result.current.createQuiz({ name: 'Doomed' })
      id = q.id
    })
    expect(result.current.quizzes).toHaveLength(1)
    await act(async () => {
      await result.current.deleteQuiz(id)
    })
    expect(result.current.quizzes).toHaveLength(0)
  })
})

describe('useQuiz', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  async function seedQuiz() {
    const q = makeQuiz({ name: 'Seed' })
    await storage.saveQuiz(q)
    return q.id
  }

  it('loads a quiz by id', async () => {
    const id = await seedQuiz()
    const { result } = renderHook(() => useQuiz(id), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.quiz).not.toBeNull())
    expect(result.current.quiz?.name).toBe('Seed')
    expect(result.current.quiz?.questions).toHaveLength(0)
  })

  it('adds, updates, and deletes an MC question', async () => {
    const id = await seedQuiz()
    const { result } = renderHook(() => useQuiz(id), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.quiz).not.toBeNull())

    let qid = ''
    await act(async () => {
      const q = await result.current.addQuestion(
        newMcQuestion({ prompt: 'p', options: ['a', 'b'], correctIndex: 0 }),
      )
      qid = q.id
    })
    expect(result.current.quiz?.questions).toHaveLength(1)

    await act(async () => {
      await result.current.updateQuestion(qid, { prompt: 'p2' })
    })
    expect(result.current.quiz?.questions[0].prompt).toBe('p2')

    await act(async () => {
      await result.current.deleteQuestion(qid)
    })
    expect(result.current.quiz?.questions).toHaveLength(0)
  })

  it('adds a FIB question alongside MC', async () => {
    const id = await seedQuiz()
    const { result } = renderHook(() => useQuiz(id), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.quiz).not.toBeNull())

    await act(async () => {
      await result.current.addQuestion(
        newMcQuestion({ prompt: 'm', options: ['a', 'b'], correctIndex: 0 }),
      )
      await result.current.addQuestion(newFibQuestion({ prompt: 'f', answers: ['x'] }))
    })
    expect(result.current.quiz?.questions.map((q) => q.type)).toEqual([
      'multiple_choice',
      'fill_in_blank',
    ])
  })

  it('toggles a built-in tag on a question', async () => {
    const id = await seedQuiz()
    const { result } = renderHook(() => useQuiz(id), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.quiz).not.toBeNull())
    let qid = ''
    await act(async () => {
      const q = await result.current.addQuestion(newFibQuestion({ prompt: 'p', answers: ['a'] }))
      qid = q.id
    })
    await act(async () => {
      await result.current.toggleBuiltInTag(qid, BUILTIN_FAVORITE_ID)
    })
    expect(result.current.quiz?.questions[0].tags).toContain(BUILTIN_FAVORITE_ID)
    await act(async () => {
      await result.current.toggleBuiltInTag(qid, BUILTIN_FAVORITE_ID)
    })
    expect(result.current.quiz?.questions[0].tags).not.toContain(BUILTIN_FAVORITE_ID)
  })

  it('bumps quiz.updatedAt on question mutation', async () => {
    const id = await seedQuiz()
    const { result } = renderHook(() => useQuiz(id), { wrapper: wrapper(storage) })
    await waitFor(() => expect(result.current.quiz).not.toBeNull())
    const before = result.current.quiz!.updatedAt
    await new Promise((r) => setTimeout(r, 5))
    await act(async () => {
      await result.current.addQuestion(newFibQuestion({ prompt: 'p', answers: ['a'] }))
    })
    expect(result.current.quiz!.updatedAt).toBeGreaterThan(before)
  })
})
