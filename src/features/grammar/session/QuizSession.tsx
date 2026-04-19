import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Question, Quiz } from '@/types/quiz'
import { useStorage } from '@/storage/useStorage'
import { useQuizSession } from './useQuizSession'
import { McQuestionView } from './McQuestionView'
import { FibQuestionView } from './FibQuestionView'
import { QuizResults } from './QuizResults'

type Props = {
  quizId: string
}

type Phase = { kind: 'pre' } | { kind: 'running'; shuffle: boolean }

export function QuizSession({ quizId }: Props) {
  const storage = useStorage()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'pre' })
  const [shuffle, setShuffle] = useState(false)

  useEffect(() => {
    void storage.getQuiz(quizId).then(setQuiz)
  }, [storage, quizId])

  if (phase.kind === 'pre') {
    return (
      <div className="space-y-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold">測驗設定</h1>
        {quiz && (
          <p className="text-slate-600">
            {quiz.name} · {quiz.questions.length} 題
          </p>
        )}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
            aria-label="隨機出題"
          />
          隨機出題
        </label>
        <button
          type="button"
          disabled={!quiz || quiz.questions.length === 0}
          onClick={() => setPhase({ kind: 'running', shuffle })}
          className="rounded px-3 py-1 bg-slate-800 text-white disabled:opacity-50"
        >
          開始
        </button>
      </div>
    )
  }

  return (
    <RunningSession
      quizId={quizId}
      shuffle={phase.shuffle}
      onExit={() => navigate(`/grammar/${quizId}`)}
    />
  )
}

function RunningSession({
  quizId,
  shuffle,
  onExit,
}: {
  quizId: string
  shuffle: boolean
  onExit: () => void
}) {
  const { state, submit, next, restart, reviewIncorrect } = useQuizSession(quizId, { shuffle })
  const storage = useStorage()
  const [quiz, setQuiz] = useState<Quiz | null>(null)

  useEffect(() => {
    void storage.getQuiz(quizId).then(setQuiz)
  }, [storage, quizId])

  if (state.phase === 'loading' || !quiz) {
    return <p>載入中…</p>
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
    return <p>找不到題目。</p>
  }

  if (question.type === 'multiple_choice') {
    return (
      <McSessionView
        key={question.id}
        question={question}
        phase={state.phase}
        onSubmit={(i) => void submit({ kind: 'mc', optionIndex: i })}
        onNext={next}
      />
    )
  }

  return (
    <FibSessionView
      key={question.id}
      question={question}
      phase={state.phase}
      grade={state.lastGrade}
      onSubmit={(text) => void submit({ kind: 'fib', text })}
      onNext={next}
    />
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
