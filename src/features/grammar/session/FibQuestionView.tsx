import type { FillInBlankQuestion } from '@/types/quiz'

type Props = {
  question: FillInBlankQuestion
  phase: 'prompting' | 'revealed'
  text: string
  onChangeText: (value: string) => void
  grade: 'correct' | 'incorrect' | undefined
  onSubmit: () => void
  onNext: () => void
}

export function FibQuestionView({
  question,
  phase,
  text,
  onChangeText,
  grade,
  onSubmit,
  onNext,
}: Props) {
  const revealed = phase === 'revealed'
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!revealed) onSubmit()
      }}
    >
      <div className="rounded border p-6 text-xl whitespace-pre-line">{question.prompt}</div>
      <label className="block">
        <span className="block text-sm">你的答案</span>
        <input
          aria-label="填入答案"
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          disabled={revealed}
          className="w-full rounded border px-2 py-1"
          autoFocus
        />
      </label>
      {revealed ? (
        <div className="space-y-1">
          <p
            className={
              'text-sm ' + (grade === 'correct' ? 'text-green-700' : 'text-red-700')
            }
          >
            {grade === 'correct' ? '答對！' : '答錯'}
          </p>
          <p className="text-sm text-slate-600">
            可接受答案：{question.answers.join(' / ')}
          </p>
          {question.explanation && (
            <p className="text-sm text-slate-600">解說：{question.explanation}</p>
          )}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={onNext}
              className="rounded px-3 py-1 bg-slate-800 text-white"
            >
              下一題
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <button type="submit" className="rounded px-3 py-1 bg-slate-800 text-white">
            送出
          </button>
        </div>
      )}
    </form>
  )
}
