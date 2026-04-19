import { useCallback, useEffect, useState } from 'react'
import type { Question, Quiz } from '@/types/quiz'
import { useStorage } from '@/storage/useStorage'
import { gradeAnswer, type AnswerInput } from '../grading'

export type SessionState = {
  queue: string[]
  index: number
  phase: 'loading' | 'prompting' | 'revealed' | 'finished'
  answers: Record<string, 'correct' | 'incorrect'>
  lastGrade?: 'correct' | 'incorrect'
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQueue(quiz: Quiz, shuffle: boolean): string[] {
  const ids = quiz.questions.map((q) => q.id)
  return shuffle ? shuffleInPlace([...ids]) : ids
}

function shapeMatches(question: Question, input: AnswerInput): boolean {
  if (question.type === 'multiple_choice') return input.kind === 'mc'
  return input.kind === 'fib'
}

export function useQuizSession(
  quizId: string,
  options: { shuffle: boolean },
) {
  const storage = useStorage()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [state, setState] = useState<SessionState>({
    queue: [],
    index: 0,
    phase: 'loading',
    answers: {},
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const q = await storage.getQuiz(quizId)
      if (cancelled || !q) return
      setQuiz(q)
      const queue = buildQueue(q, options.shuffle)
      setState({
        queue,
        index: 0,
        phase: queue.length === 0 ? 'finished' : 'prompting',
        answers: {},
      })
    })()
    return () => {
      cancelled = true
    }
  }, [storage, quizId, options.shuffle])

  const currentQuestionId = state.queue[state.index]

  const persistStats = useCallback(
    async (questionId: string, grade: 'correct' | 'incorrect') => {
      const latest = await storage.getQuiz(quizId)
      if (!latest) return
      const next: Quiz = {
        ...latest,
        questions: latest.questions.map((item) => {
          if (item.id !== questionId) return item
          const stats = {
            ...item.stats,
            correctCount: item.stats.correctCount + (grade === 'correct' ? 1 : 0),
            incorrectCount: item.stats.incorrectCount + (grade === 'incorrect' ? 1 : 0),
            lastReviewedAt: Date.now(),
          }
          return { ...item, stats } as Question
        }),
        updatedAt: Date.now(),
      }
      await storage.saveQuiz(next)
    },
    [storage, quizId],
  )

  const submit = useCallback(
    async (answer: AnswerInput) => {
      if (!quiz || !currentQuestionId || state.phase !== 'prompting') return
      const question = quiz.questions.find((q) => q.id === currentQuestionId)
      if (!question) return
      if (!shapeMatches(question, answer)) return
      const grade = gradeAnswer(question, answer)
      await persistStats(currentQuestionId, grade)
      setState((s) => ({
        ...s,
        phase: 'revealed',
        lastGrade: grade,
        answers: { ...s.answers, [currentQuestionId]: grade },
      }))
    },
    [quiz, currentQuestionId, state.phase, persistStats],
  )

  const next = useCallback(() => {
    setState((s) => {
      const nextIndex = s.index + 1
      if (nextIndex >= s.queue.length) {
        return { ...s, phase: 'finished', lastGrade: undefined }
      }
      return { ...s, index: nextIndex, phase: 'prompting', lastGrade: undefined }
    })
  }, [])

  const restart = useCallback(() => {
    if (!quiz) return
    const queue = buildQueue(quiz, options.shuffle)
    setState({
      queue,
      index: 0,
      phase: queue.length === 0 ? 'finished' : 'prompting',
      answers: {},
    })
  }, [quiz, options.shuffle])

  const reviewIncorrect = useCallback(() => {
    if (!quiz) return
    const incorrectIds = Object.entries(state.answers)
      .filter(([, grade]) => grade === 'incorrect')
      .map(([id]) => id)
    setState({
      queue: incorrectIds,
      index: 0,
      phase: incorrectIds.length === 0 ? 'finished' : 'prompting',
      answers: {},
    })
  }, [quiz, state.answers])

  return { state, submit, next, restart, reviewIncorrect }
}
