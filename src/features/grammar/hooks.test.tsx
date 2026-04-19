import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { useQuizzes } from './hooks'

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
