import type { MultipleChoiceQuestion } from '@/types/quiz'

type Props = {
  question: MultipleChoiceQuestion
  phase: 'prompting' | 'revealed'
  selectedIndex: number | null
  onSubmit: (optionIndex: number) => void
  onNext: () => void
}

export function McQuestionView({ question, phase, selectedIndex, onSubmit, onNext }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded border p-6 text-xl whitespace-pre-line">{question.prompt}</div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex
          const isSelected = i === selectedIndex
          const revealed = phase === 'revealed'
          const classes = [
            'rounded border px-3 py-2 text-left w-full',
            revealed && isCorrect ? 'border-green-500 bg-green-50' : '',
            revealed && isSelected && !isCorrect ? 'border-red-500 bg-red-50' : '',
            !revealed ? 'hover:bg-slate-50' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <li key={i}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => onSubmit(i)}
                className={classes}
              >
                {opt}
              </button>
            </li>
          )
        })}
      </ul>
      {phase === 'revealed' && (
        <>
          {question.explanation && (
            <p className="text-sm text-slate-600">解說：{question.explanation}</p>
          )}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onNext}
              className="rounded px-3 py-1 bg-slate-800 text-white"
            >
              下一題
            </button>
          </div>
        </>
      )}
    </div>
  )
}
