import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Card, Deck } from '@/types/deck'
import { useStorage } from '@/storage/useStorage'
import { headwordOf } from '@/utils/headword'
import { sampleDistractors } from './mcSampling'
import { blankExample } from './clozeSampling'

export type PracticeMode = 'flip' | 'multiple_choice' | 'cloze'

/** Flip-mode self-assessment: correct / uncertain (needs review) / incorrect. */
export type FlipResult = 'correct' | 'uncertain' | 'incorrect'

export type AnswerInput =
  | { kind: 'flip'; result: FlipResult }
  | { kind: 'mc'; optionIndex: number }

export type SessionState = {
  queue: string[]
  /** Mode of each queue position — segments follow the selected mode order. */
  queueModes: PracticeMode[]
  index: number
  phase: 'loading' | 'prompting' | 'revealed' | 'finished'
  answers: Record<string, FlipResult>
  mcChoices?: string[]
  mcCorrectIndex?: number
  /** Cloze mode: example sentence with the headword blanked out. */
  clozeSentence?: string
  /** Cloze mode: 中文 meaning of each option, aligned with mcChoices. */
  clozeMeanings?: string[]
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQueue(cards: Card[], shuffle: boolean, limit?: number): string[] {
  const ids = cards.map((c) => c.id)
  const ordered = shuffle ? shuffleInPlace([...ids]) : ids
  return limit != null && limit > 0 ? ordered.slice(0, limit) : ordered
}

/** How many questions the first of two modes gets, at the given ratio.
    Both modes are guaranteed at least one question when total permits. */
export function splitCounts(total: number, ratio: number): [number, number] {
  if (total <= 0) return [0, 0]
  if (total === 1) return [1, 0]
  const first = Math.min(Math.max(Math.round(total * ratio), 1), total - 1)
  return [first, total - first]
}

/** Assign a mode to every queue position. Single mode fills everything;
    two modes split by ratio in selection order; three or more split into
    equal consecutive segments in selection order. */
function assignModes(len: number, modes: PracticeMode[], ratio: number): PracticeMode[] {
  if (modes.length <= 1) return Array<PracticeMode>(len).fill(modes[0] ?? 'flip')
  if (modes.length === 2) {
    const [first] = splitCounts(len, ratio)
    return Array.from({ length: len }, (_, i) => (i < first ? modes[0] : modes[1]))
  }
  return Array.from({ length: len }, (_, i) =>
    modes[Math.min(Math.floor((i * modes.length) / len), modes.length - 1)],
  )
}

function computeMcSample(
  cards: Card[],
  cardId: string,
): { mcChoices: string[]; mcCorrectIndex: number } {
  const card = cards.find((c) => c.id === cardId)!
  const others = cards.filter((c) => c.id !== cardId).map((c) => c.back)
  const sample = sampleDistractors(card.back, others)
  return { mcChoices: sample.options, mcCorrectIndex: sample.correctIndex }
}

/** Cloze question data, or null when the card's example can't be blanked. */
function computeClozeSample(
  cards: Card[],
  cardId: string,
): {
  mcChoices: string[]
  mcCorrectIndex: number
  clozeSentence: string
  clozeMeanings: string[]
} | null {
  const card = cards.find((c) => c.id === cardId)!
  const head = headwordOf(card)
  const cloze = card.example ? blankExample(card.example, head) : null
  if (!cloze) return null
  const others = cards.filter((c) => c.id !== cardId).map((c) => headwordOf(c))
  const sample = sampleDistractors(head, others)
  // Meaning of every option, shown after answering so distractors teach too.
  // Fallback options (e.g. "—") aren't real cards and get no meaning.
  const backOf = new Map(cards.map((c) => [headwordOf(c).toLowerCase(), c.back]))
  const clozeMeanings = sample.options.map((opt) => backOf.get(opt.toLowerCase()) ?? '')
  return {
    mcChoices: sample.options,
    mcCorrectIndex: sample.correctIndex,
    clozeSentence: cloze.blanked,
    clozeMeanings,
  }
}

function mcFieldsFor(cards: Card[], queue: string[], queueModes: PracticeMode[], index: number) {
  const empty = {
    mcChoices: undefined,
    mcCorrectIndex: undefined,
    clozeSentence: undefined,
    clozeMeanings: undefined,
  }
  const cardId = queue[index]
  if (!cardId) return empty
  const mode = queueModes[index]
  if (mode === 'cloze') {
    // Cards without a usable example fall back to a regular multiple-choice question.
    const cloze = computeClozeSample(cards, cardId)
    return (
      cloze ?? { ...computeMcSample(cards, cardId), clozeSentence: undefined, clozeMeanings: undefined }
    )
  }
  if (mode === 'multiple_choice') {
    return { ...computeMcSample(cards, cardId), clozeSentence: undefined, clozeMeanings: undefined }
  }
  return empty
}

/** Cards that carry at least one of the selected tags (empty selection = all). */
function filterByTags(cards: Card[], tagIds: string[]): Card[] {
  if (tagIds.length === 0) return cards
  return cards.filter((c) => c.tags.some((t) => tagIds.includes(t)))
}

/**
 * Practice across one or more decks with one or more modes. Cards merge (in
 * deck order) into a single pool; each answer's stats are written back to the
 * deck that owns the card. With two modes, the queue is segmented by `modeRatio`
 * (share of the first-selected mode). `tagIds` narrows the pool to cards that
 * carry at least one of the selected tags.
 */
export function usePracticeSession(
  deckIds: string | string[],
  options: {
    modes: PracticeMode[]
    modeRatio?: number
    shuffle: boolean
    limit?: number
    tagIds?: string[]
  },
) {
  const storage = useStorage()
  const idsKey = Array.isArray(deckIds) ? deckIds.join(',') : deckIds
  const modesKey = options.modes.join(',')
  const tagsKey = (options.tagIds ?? []).join(',')
  const ratio = options.modeRatio ?? 0.5
  const [decks, setDecks] = useState<Deck[]>([])
  const [state, setState] = useState<SessionState>({
    queue: [],
    queueModes: [],
    index: 0,
    phase: 'loading',
    answers: {},
  })

  // The whole session (queue, distractors, review) works on the tag-filtered pool.
  const cards = useMemo(
    () => filterByTags(decks.flatMap((d) => d.cards), tagsKey.split(',').filter(Boolean)),
    [decks, tagsKey],
  )
  const deckIdOfCard = useMemo(
    () => new Map(decks.flatMap((d) => d.cards.map((c) => [c.id, d.id] as const))),
    [decks],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const ids = idsKey.split(',').filter(Boolean)
      const loaded = (await Promise.all(ids.map((id) => storage.getDeck(id)))).filter(
        (d): d is Deck => d != null,
      )
      if (cancelled) return
      setDecks(loaded)
      const pool = filterByTags(
        loaded.flatMap((d) => d.cards),
        tagsKey.split(',').filter(Boolean),
      )
      const queue = buildQueue(pool, options.shuffle, options.limit)
      const queueModes = assignModes(queue.length, modesKey.split(',') as PracticeMode[], ratio)
      setState({
        queue,
        queueModes,
        index: 0,
        phase: queue.length === 0 ? 'finished' : 'prompting',
        answers: {},
        ...mcFieldsFor(pool, queue, queueModes, 0),
      })
    })()
    return () => {
      cancelled = true
    }
  }, [storage, idsKey, modesKey, tagsKey, ratio, options.shuffle, options.limit])

  const currentCardId = state.queue[state.index]

  const persistStats = useCallback(
    async (cardId: string, result: FlipResult) => {
      const owningDeckId = deckIdOfCard.get(cardId)
      if (!owningDeckId) return
      const latest = await storage.getDeck(owningDeckId)
      if (!latest) return
      const next: Deck = {
        ...latest,
        cards: latest.cards.map<Card>((c) => {
          if (c.id !== cardId) return c
          // 'uncertain' bumps neither counter — it only marks the review time
          // and keeps the card in this session's review-incorrect queue.
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
    [storage, deckIdOfCard],
  )

  const submit = useCallback(
    async (answer: AnswerInput) => {
      if (!currentCardId || state.phase !== 'prompting') return
      let result: FlipResult
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
      if (cards.length === 0) return s
      return {
        ...s,
        index: nextIndex,
        phase: 'prompting',
        ...mcFieldsFor(cards, s.queue, s.queueModes, nextIndex),
      }
    })
  }, [cards])

  const restart = useCallback(() => {
    if (cards.length === 0) return
    const queue = buildQueue(cards, options.shuffle, options.limit)
    const queueModes = assignModes(queue.length, modesKey.split(',') as PracticeMode[], ratio)
    setState({
      queue,
      queueModes,
      index: 0,
      phase: queue.length === 0 ? 'finished' : 'prompting',
      answers: {},
      ...mcFieldsFor(cards, queue, queueModes, 0),
    })
  }, [cards, modesKey, ratio, options.shuffle, options.limit])

  const reviewIncorrect = useCallback(() => {
    if (cards.length === 0) return
    // Everything not confidently known — wrong AND uncertain — gets reviewed.
    const incorrectIds = Object.entries(state.answers)
      .filter(([, r]) => r !== 'correct')
      .map(([id]) => id)
    const queueModes = assignModes(
      incorrectIds.length,
      modesKey.split(',') as PracticeMode[],
      ratio,
    )
    setState({
      queue: incorrectIds,
      queueModes,
      index: 0,
      phase: incorrectIds.length === 0 ? 'finished' : 'prompting',
      answers: {},
      ...mcFieldsFor(cards, incorrectIds, queueModes, 0),
    })
  }, [cards, modesKey, ratio, state.answers])

  return { state, cards, submit, next, restart, reviewIncorrect }
}
