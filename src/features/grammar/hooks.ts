import { useCallback, useEffect, useState } from 'react'
import type { Quiz } from '@/types/quiz'
import { useStorage } from '@/storage/useStorage'
import { newQuiz } from './factories'

export function useQuizzes() {
  const storage = useStorage()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await storage.listQuizzes()
    setQuizzes(list.sort((a, b) => b.updatedAt - a.updatedAt))
    setLoading(false)
  }, [storage])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createQuiz = useCallback(
    async (input: { name: string; description?: string }) => {
      const quiz = newQuiz(input)
      await storage.saveQuiz(quiz)
      await refresh()
      return quiz
    },
    [storage, refresh],
  )

  const renameQuiz = useCallback(
    async (id: string, name: string) => {
      const existing = await storage.getQuiz(id)
      if (!existing) throw new Error(`Quiz not found: ${id}`)
      await storage.saveQuiz({ ...existing, name, updatedAt: Date.now() })
      await refresh()
    },
    [storage, refresh],
  )

  const deleteQuiz = useCallback(
    async (id: string) => {
      await storage.deleteQuiz(id)
      await refresh()
    },
    [storage, refresh],
  )

  return { quizzes, loading, createQuiz, renameQuiz, deleteQuiz, refresh }
}
