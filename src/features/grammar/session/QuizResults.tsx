import { useEffect, useState } from 'react'
import { PartyPopper, RotateCcw, Target, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  correct: number
  total: number
  hasIncorrect: boolean
  onRestart: () => void
  onReviewIncorrect: () => void
  onFinish: () => void
}

/** Counts 0 → value over ~600ms; renders instantly under reduced motion. */
function useCountUp(value: number) {
  const [display, setDisplay] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? value : 0,
  )
  useEffect(() => {
    // Initial state already equals `value` under reduced motion (and 0 → 0),
    // so both early returns need no synchronous setState.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || value === 0) return
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / 600, 1)
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return display
}

export function QuizResults({
  correct,
  total,
  hasIncorrect,
  onRestart,
  onReviewIncorrect,
  onFinish,
}: Props) {
  const displayed = useCountUp(correct)
  const perfect = total > 0 && correct === total

  return (
    <div className="mx-auto max-w-md space-y-6 pt-4 text-center animate-in fade-in zoom-in-95">
      <span
        className={
          'mx-auto flex size-16 items-center justify-center rounded-full ' +
          (perfect ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary')
        }
      >
        {perfect ? <Trophy className="size-8" aria-hidden="true" /> : <PartyPopper className="size-8" aria-hidden="true" />}
      </span>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">本次結果</h2>
        <p
          className={
            'font-heading text-5xl font-bold tabular-nums ' + (perfect ? 'text-success' : 'text-primary')
          }
        >
          {displayed} / {total}
        </p>
        <p className="text-sm text-muted-foreground">
          {perfect ? '全對！太強了。' : hasIncorrect ? '把做錯的再測一次，觀念更牢。' : '做得好！'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" onClick={onRestart}>
          <RotateCcw data-icon="inline-start" aria-hidden="true" />
          再測一次
        </Button>
        <Button type="button" disabled={!hasIncorrect} onClick={onReviewIncorrect}>
          <Target data-icon="inline-start" aria-hidden="true" />
          只做錯的
        </Button>
        <Button type="button" variant="ghost" onClick={onFinish}>
          完成
        </Button>
      </div>
    </div>
  )
}
