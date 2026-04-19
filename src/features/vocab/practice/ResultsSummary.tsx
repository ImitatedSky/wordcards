type Props = {
  correct: number
  total: number
  hasIncorrect: boolean
  onRestart: () => void
  onReviewIncorrect: () => void
  onFinish: () => void
}

export function ResultsSummary({
  correct,
  total,
  hasIncorrect,
  onRestart,
  onReviewIncorrect,
  onFinish,
}: Props) {
  return (
    <div className="space-y-4 text-center">
      <h2 className="text-xl font-semibold">本次結果</h2>
      <p className="text-3xl font-bold">
        {correct} / {total}
      </p>
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={onRestart}
          className="rounded px-3 py-1 border hover:bg-slate-50"
        >
          再練一次
        </button>
        <button
          type="button"
          onClick={onReviewIncorrect}
          disabled={!hasIncorrect}
          className={
            'rounded px-3 py-1 ' +
            (hasIncorrect
              ? 'bg-slate-800 text-white'
              : 'border text-slate-400 cursor-not-allowed')
          }
        >
          只練錯的
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="rounded px-3 py-1 border hover:bg-slate-50"
        >
          完成
        </button>
      </div>
    </div>
  )
}
