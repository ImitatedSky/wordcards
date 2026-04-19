import { useCallback, useEffect, useState } from 'react'
import type { Quiz, Question } from '@/types/quiz'
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

export function useQuiz(quizId: string | undefined) {
  const storage = useStorage()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!quizId) {
      setQuiz(null)
      setLoading(false)
      return
    }
    const q = await storage.getQuiz(quizId)
    setQuiz(q)
    setLoading(false)
  }, [storage, quizId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const persist = useCallback(
    async (updater: (q: Quiz) => Quiz) => {
      if (!quizId) throw new Error('No quizId')
      const current = await storage.getQuiz(quizId)
      if (!current) throw new Error(`Quiz not found: ${quizId}`)
      const next = { ...updater(current), updatedAt: Date.now() }
      await storage.saveQuiz(next)
      await refresh()
      return next
    },
    [storage, quizId, refresh],
  )

  const addQuestion = useCallback(
    async (question: Question) => {
      await persist((q) => ({ ...q, questions: [...q.questions, question] }))
      return question
    },
    [persist],
  )

  const updateQuestion = useCallback(
    async (questionId: string, patch: Partial<Omit<Question, 'id' | 'stats' | 'type'>>) => {
      await persist((q) => ({
        ...q,
        questions: q.questions.map((item) =>
          item.id === questionId ? ({ ...item, ...patch } as Question) : item,
        ),
      }))
    },
    [persist],
  )

  const deleteQuestion = useCallback(
    async (questionId: string) => {
      await persist((q) => ({
        ...q,
        questions: q.questions.filter((item) => item.id !== questionId),
      }))
    },
    [persist],
  )

  const toggleBuiltInTag = useCallback(
    async (questionId: string, builtinId: string) => {
      await persist((q) => ({
        ...q,
        questions: q.questions.map((item) => {
          if (item.id !== questionId) return item
          const has = item.tags.includes(builtinId)
          return {
            ...item,
            tags: has ? item.tags.filter((t) => t !== builtinId) : [...item.tags, builtinId],
          } as Question
        }),
      }))
    },
    [persist],
  )

  return { quiz, loading, addQuestion, updateQuestion, deleteQuestion, toggleBuiltInTag, refresh }
}
