import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStorage } from '@/storage/useStorage'
import type { Deck } from '@/types/deck'
import { usePracticeSession, type PracticeMode } from './usePracticeSession'
import { FlipMode } from './FlipMode'
import { MultipleChoiceMode } from './MultipleChoiceMode'
import { ResultsSummary } from './ResultsSummary'

type Props = {
  deckId: string
}

type Phase =
  | { kind: 'pre'; deck: Deck | null }
  | { kind: 'running'; mode: PracticeMode; shuffle: boolean }

export function PracticeSession({ deckId }: Props) {
  const storage = useStorage()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'pre', deck: null })
  const [mode, setMode] = useState<PracticeMode>('flip')
  const [shuffle, setShuffle] = useState(true)

  useEffect(() => {
    void storage.getDeck(deckId).then(setDeck)
  }, [storage, deckId])

  if (phase.kind === 'pre') {
    return (
      <div className="space-y-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold">練習設定</h1>
        {deck && <p className="text-slate-600">{deck.name} · {deck.cards.length} 張單字</p>}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">模式</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              value="flip"
              checked={mode === 'flip'}
              onChange={() => setMode('flip')}
            />
            翻牌 (自評)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              value="multiple_choice"
              checked={mode === 'multiple_choice'}
              onChange={() => setMode('multiple_choice')}
            />
            選擇題
          </label>
        </fieldset>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
          />
          隨機出題
        </label>
        <button
          type="button"
          disabled={!deck || deck.cards.length === 0}
          onClick={() => setPhase({ kind: 'running', mode, shuffle })}
          className="rounded px-3 py-1 bg-slate-800 text-white disabled:opacity-50"
        >
          開始
        </button>
      </div>
    )
  }

  return (
    <RunningSession
      deckId={deckId}
      mode={phase.mode}
      shuffle={phase.shuffle}
      onExit={() => navigate(`/vocab/${deckId}`)}
    />
  )
}

function RunningSession({
  deckId,
  mode,
  shuffle,
  onExit,
}: {
  deckId: string
  mode: PracticeMode
  shuffle: boolean
  onExit: () => void
}) {
  const { state, submit, next, restart, reviewIncorrect } = usePracticeSession(deckId, {
    mode,
    shuffle,
  })
  const storage = useStorage()
  const [deck, setDeck] = useState<Deck | null>(null)

  useEffect(() => {
    void storage.getDeck(deckId).then(setDeck)
  }, [storage, deckId])

  if (state.phase === 'loading' || !deck) {
    return <p>載入中…</p>
  }

  if (state.phase === 'finished') {
    const total = Object.keys(state.answers).length
    const correct = Object.values(state.answers).filter((r) => r === 'correct').length
    const hasIncorrect = total - correct > 0
    return (
      <ResultsSummary
        correct={correct}
        total={total}
        hasIncorrect={hasIncorrect}
        onRestart={restart}
        onReviewIncorrect={reviewIncorrect}
        onFinish={onExit}
      />
    )
  }

  const card = deck.cards.find((c) => c.id === state.queue[state.index])
  if (!card) {
    return <p>找不到單字。</p>
  }

  if (state.mode === 'flip') {
    return (
      <FlipMode
        card={card}
        phase={state.phase}
        onSubmit={(r) => void submit({ kind: 'flip', result: r })}
        onNext={next}
      />
    )
  }

  return (
    <McSessionView
      key={card.id}
      card={card}
      choices={state.mcChoices!}
      correctIndex={state.mcCorrectIndex!}
      phase={state.phase}
      onSubmit={(i) => void submit({ kind: 'mc', optionIndex: i })}
      onNext={next}
    />
  )
}

function McSessionView(props: {
  card: Deck['cards'][number]
  choices: string[]
  correctIndex: number
  phase: 'prompting' | 'revealed' | 'loading' | 'finished'
  onSubmit: (i: number) => void
  onNext: () => void
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  function handleSubmit(i: number) {
    setSelectedIndex(i)
    props.onSubmit(i)
  }
  function handleNext() {
    setSelectedIndex(null)
    props.onNext()
  }
  if (props.phase !== 'prompting' && props.phase !== 'revealed') return null
  return (
    <MultipleChoiceMode
      card={props.card}
      choices={props.choices}
      correctIndex={props.correctIndex}
      selectedIndex={selectedIndex}
      phase={props.phase}
      onSubmit={handleSubmit}
      onNext={handleNext}
    />
  )
}
