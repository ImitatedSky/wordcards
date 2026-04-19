import type { Card } from '@/types/deck'

type Props = {
  card: Card
  phase: 'prompting' | 'revealed'
  onSubmit: (result: 'correct' | 'incorrect') => void
  onNext: () => void
}

export function FlipMode({ card, phase, onSubmit, onNext }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded border p-6 text-center text-2xl">{card.front}</div>
      {phase === 'revealed' ? (
        <div className="rounded border p-6 text-center text-xl bg-slate-50">{card.back}</div>
      ) : (
        <div className="text-center text-slate-400">點「顯示答案」查看背面</div>
      )}
      {phase === 'prompting' ? (
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => onSubmit('correct')}
            className="rounded px-3 py-1 bg-green-600 text-white"
          >
            我會 (顯示答案)
          </button>
          <button
            type="button"
            onClick={() => onSubmit('incorrect')}
            className="rounded px-3 py-1 bg-red-600 text-white"
          >
            我不會 (顯示答案)
          </button>
        </div>
      ) : (
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
