import { useCallback, useEffect, useState } from 'react'
import type { Card, Deck } from '@/types/deck'
import { useStorage } from '@/storage/useStorage'
import { sampleDistractors } from './mcSampling'

export type PracticeMode = 'flip' | 'multiple_choice'

export type AnswerInput =
  | { kind: 'flip'; result: 'correct' | 'incorrect' }
  | { kind: 'mc'; optionIndex: number }

export type SessionState = {
  mode: PracticeMode
  queue: string[]
  index: number
  phase: 'loading' | 'prompting' | 'revealed' | 'finished'
  answers: Record<string, 'correct' | 'incorrect'>
  mcChoices?: string[]
  mcCorrectIndex?: number
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQueue(deck: Deck, shuffle: boolean): string[] {
  const ids = deck.cards.map((c) => c.id)
  return shuffle ? shuffleInPlace([...ids]) : ids
}

function computeMcSample(
  deck: Deck,
  cardId: string,
): { mcChoices: string[]; mcCorrectIndex: number } {
  const card = deck.cards.find((c) => c.id === cardId)!
  const others = deck.cards.filter((c) => c.id !== cardId).map((c) => c.back)
  const sample = sampleDistractors(card.back, others)
  return { mcChoices: sample.options, mcCorrectIndex: sample.correctIndex }
}

export function usePracticeSession(
  deckId: string,
  options: { mode: PracticeMode; shuffle: boolean },
) {
  const storage = useStorage()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [state, setState] = useState<SessionState>({
    mode: options.mode,
    queue: [],
    index: 0,
    phase: 'loading',
    answers: {},
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const d = await storage.getDeck(deckId)
      if (cancelled || !d) return
      setDeck(d)
      const queue = buildQueue(d, options.shuffle)
      setState({
        mode: options.mode,
        queue,
        index: 0,
        phase: queue.length === 0 ? 'finished' : 'prompting',
        answers: {},
        ...(options.mode === 'multiple_choice' && queue.length > 0
          ? computeMcSample(d, queue[0])
          : {}),
      })
    })()
    return () => {
      cancelled = true
    }
  }, [storage, deckId, options.mode, options.shuffle])

  const currentCardId = state.queue[state.index]

  const persistStats = useCallback(
    async (cardId: string, result: 'correct' | 'incorrect') => {
      const latest = await storage.getDeck(deckId)
      if (!latest) return
      const next: Deck = {
        ...latest,
        cards: latest.cards.map<Card>((c) => {
          if (c.id !== cardId) return c
          const stats = {
            ...c.stats,
            correctCount: c.stats.correctCount + (result === 'correct' ? 1 : 0),
            incorrectCount: c.stats.incorrectCount + (result === 'incorrect' ? 1 : 0),
            lastReviewedAt: Date.now(),
          }
          return { ...c, stats }
        }),
        updatedAt: Date.now(),
      }
      await storage.saveDeck(next)
    },
    [storage, deckId],
  )

  const submit = useCallback(
    async (answer: AnswerInput) => {
      if (!currentCardId || state.phase !== 'prompting') return
      let result: 'correct' | 'incorrect'
      if (answer.kind === 'flip') {
        result = answer.result
      } else {
        result = answer.optionIndex === state.mcCorrectIndex ? 'correct' : 'incorrect'
      }
      await persistStats(currentCardId, result)
      setState((s) => ({
        ...s,
        phase: 'revealed',
        answers: { ...s.answers, [currentCardId]: result },
      }))
    },
    [currentCardId, state.phase, state.mcCorrectIndex, persistStats],
  )

  const next = useCallback(() => {
    setState((s) => {
      const nextIndex = s.index + 1
      if (nextIndex >= s.queue.length) {
        return { ...s, phase: 'finished' }
      }
      if (!deck) return s
      return {
        ...s,
        index: nextIndex,
        phase: 'prompting',
        ...(s.mode === 'multiple_choice' ? computeMcSample(deck, s.queue[nextIndex]) : {}),
      }
    })
  }, [deck])

  const restart = useCallback(() => {
    if (!deck) return
    const queue = buildQueue(deck, options.shuffle)
    setState({
      mode: options.mode,
      queue,
      index: 0,
      phase: queue.length === 0 ? 'finished' : 'prompting',
      answers: {},
      ...(options.mode === 'multiple_choice' && queue.length > 0
        ? computeMcSample(deck, queue[0])
        : {}),
    })
  }, [deck, options.mode, options.shuffle])

  const reviewIncorrect = useCallback(() => {
    if (!deck) return
    const incorrectIds = Object.entries(state.answers)
      .filter(([, r]) => r === 'incorrect')
      .map(([id]) => id)
    setState({
      mode: options.mode,
      queue: incorrectIds,
      index: 0,
      phase: incorrectIds.length === 0 ? 'finished' : 'prompting',
      answers: {},
      ...(options.mode === 'multiple_choice' && incorrectIds.length > 0
        ? computeMcSample(deck, incorrectIds[0])
        : {}),
    })
  }, [deck, options.mode, state.answers])

  return { state, submit, next, restart, reviewIncorrect }
}
