import type { Card } from '@/types/deck'

type Props = {
  card: Card
  choices: string[]
  correctIndex: number
  selectedIndex: number | null
  phase: 'prompting' | 'revealed'
  onSubmit: (optionIndex: number) => void
  onNext: () => void
}

export function MultipleChoiceMode({
  card,
  choices,
  correctIndex,
  selectedIndex,
  phase,
  onSubmit,
  onNext,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded border p-6 text-center text-2xl">{card.front}</div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {choices.map((opt, i) => {
          const isCorrect = i === correctIndex
          const isSelected = i === selectedIndex
          const revealed = phase === 'revealed'
          const classes = [
            'rounded border px-3 py-2 text-left',
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
                className={classes + ' w-full'}
              >
                {opt}
              </button>
            </li>
          )
        })}
      </ul>
      {phase === 'revealed' && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onNext}
            className="rounded px-3 py-1 bg-slate-800 text-white"
          >
            下一題
          </button>
        </div>
      )}
    </div>
  )
}
