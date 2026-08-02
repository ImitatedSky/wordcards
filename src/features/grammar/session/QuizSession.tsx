import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Shuffle, X } from 'lucide-react'
import {
  DEFAULT_SESSION_SIZE,
  resolveSessionLimit,
  type SessionSize,
} from '@/features/vocab/practice/sessionLimit'
import { SessionSizeField } from '@/features/vocab/practice/SessionSizeField'
import type { Question, Quiz } from '@/types/quiz'
import { Button } from '@/components/ui/button'
import { useStorage } from '@/storage/useStorage'
import { useQuizSession } from './useQuizSession'
import { McQuestionView } from './McQuestionView'
import { FibQuestionView } from './FibQuestionView'
import { QuizResults } from './QuizResults'

type Props = {
  quizId: string
}

type Phase = { kind: 'pre' } | { kind: 'running'; shuffle: boolean; limit?: number }

export function QuizSession({ quizId }: Props) {
  const storage = useStorage()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'pre' })
  const [shuffle, setShuffle] = useState(false)
  const [size, setSize] = useState<SessionSize>(DEFAULT_SESSION_SIZE)

  useEffect(() => {
    void storage.getQuiz(quizId).then(setQuiz)
  }, [storage, quizId])

  if (phase.kind === 'pre') {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">測驗設定</h1>
          {quiz && (
            <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
              {quiz.name} · {quiz.questions.length} 題
            </p>
          )}
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40">
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
            aria-label="隨機出題"
            className="size-4 accent-[var(--primary)]"
          />
          <Shuffle className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium">隨機出題</span>
        </label>
        <SessionSizeField total={quiz?.questions.length ?? 0} value={size} onChange={setSize} />
        <Button
          type="button"
          size="lg"
          disabled={!quiz || quiz.questions.length === 0}
          onClick={() =>
            setPhase({
              kind: 'running',
              shuffle,
              limit: resolveSessionLimit(size, quiz?.questions.length ?? 0),
            })
          }
          className="w-full"
        >
          <Play data-icon="inline-start" aria-hidden="true" />
          開始
        </Button>
      </div>
    )
  }

  return (
    <RunningSession
      quizId={quizId}
      shuffle={phase.shuffle}
      limit={phase.limit}
      onExit={() => navigate(`/grammar/${quizId}`)}
    />
  )
}

function RunningSession({
  quizId,
  shuffle,
  limit,
  onExit,
}: {
  quizId: string
  shuffle: boolean
  limit?: number
  onExit: () => void
}) {
  const { state, submit, next, restart, reviewIncorrect } = useQuizSession(quizId, {
    shuffle,
    limit,
  })
  const storage = useStorage()
  const [quiz, setQuiz] = useState<Quiz | null>(null)

  useEffect(() => {
    void storage.getQuiz(quizId).then(setQuiz)
  }, [storage, quizId])

  if (state.phase === 'loading' || !quiz) {
    return (
      <div className="mx-auto max-w-xl space-y-4" aria-label="載入中">
        <div className="h-2 animate-pulse rounded-full bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (state.phase === 'finished') {
    const total = Object.keys(state.answers).length
    const correct = Object.values(state.answers).filter((r) => r === 'correct').length
    const hasIncorrect = total - correct > 0
    return (
      <QuizResults
        correct={correct}
        total={total}
        hasIncorrect={hasIncorrect}
        onRestart={restart}
        onReviewIncorrect={reviewIncorrect}
        onFinish={onExit}
      />
    )
  }

  const question: Question | undefined = quiz.questions.find(
    (q) => q.id === state.queue[state.index],
  )
  if (!question) {
    return <p className="text-center text-muted-foreground">找不到題目。</p>
  }

  const position = state.index + 1
  const total = state.queue.length

  return (
    <div className="space-y-6">
      {/* Session progress */}
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div
          role="progressbar"
          aria-label="測驗進度"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={position}
          aria-valuetext={`${position} / ${total}`}
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${(position / total) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          {position} / {total}
        </span>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="結束測驗" onClick={onExit}>
          <X aria-hidden="true" />
        </Button>
      </div>

      {question.type === 'multiple_choice' ? (
        <McSessionView
          key={question.id}
          question={question}
          phase={state.phase}
          onSubmit={(i) => void submit({ kind: 'mc', optionIndex: i })}
          onNext={next}
        />
      ) : (
        <FibSessionView
          key={question.id}
          question={question}
          phase={state.phase}
          grade={state.lastGrade}
          onSubmit={(text) => void submit({ kind: 'fib', text })}
          onNext={next}
        />
      )}
    </div>
  )
}

function McSessionView(props: {
  question: import('@/types/quiz').MultipleChoiceQuestion
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
    <McQuestionView
      question={props.question}
      phase={props.phase}
      selectedIndex={selectedIndex}
      onSubmit={handleSubmit}
      onNext={handleNext}
    />
  )
}

function FibSessionView(props: {
  question: import('@/types/quiz').FillInBlankQuestion
  phase: 'prompting' | 'revealed' | 'loading' | 'finished'
  grade: 'correct' | 'incorrect' | undefined
  onSubmit: (text: string) => void
  onNext: () => void
}) {
  const [text, setText] = useState('')
  function handleSubmit() {
    props.onSubmit(text)
  }
  function handleNext() {
    setText('')
    props.onNext()
  }
  if (props.phase !== 'prompting' && props.phase !== 'revealed') return null
  return (
    <FibQuestionView
      question={props.question}
      phase={props.phase}
      text={text}
      onChangeText={setText}
      grade={props.grade}
      onSubmit={handleSubmit}
      onNext={handleNext}
    />
  )
}
