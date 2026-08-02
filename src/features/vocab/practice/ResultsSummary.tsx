import { useEffect, useState } from 'react'
import { Check, CircleHelp, PartyPopper, RotateCcw, Target, Trophy, X } from 'lucide-react'
import type { Card } from '@/types/deck'
import { Button } from '@/components/ui/button'
import { WordCardDialog } from '@/components/common/WordCardDialog'
import { cn } from '@/lib/utils'
import type { FlipResult } from './usePracticeSession'

export type SessionWordResult = {
  card: Card
  result: FlipResult
}

type Props = {
  correct: number
  total: number
  /** Cards self-assessed as 不確定 (counted as not-yet-known). */
  uncertain?: number
  hasIncorrect: boolean
  /** Per-word results, in practice order — rendered as the session word list. */
  details?: SessionWordResult[]
  onRestart: () => void
  onReviewIncorrect: () => void
  onFinish: () => void
}

const VERDICT_META: Record<FlipResult, { label: string; icon: typeof Check; className: string }> = {
  correct: { label: '會', icon: Check, className: 'bg-success/10 text-success' },
  uncertain: { label: '不確定', icon: CircleHelp, className: 'bg-chart-3/15 text-foreground/70' },
  incorrect: { label: '不會', icon: X, className: 'bg-destructive/10 text-destructive' },
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

export function ResultsSummary({
  correct,
  total,
  uncertain = 0,
  hasIncorrect,
  details,
  onRestart,
  onReviewIncorrect,
  onFinish,
}: Props) {
  const displayed = useCountUp(correct)
  const perfect = total > 0 && correct === total
  const wrong = total - correct - uncertain
  const [openCard, setOpenCard] = useState<Card | null>(null)

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
        {uncertain > 0 && (
          <p className="text-sm text-muted-foreground tabular-nums">
            會 {correct} · 不確定 {uncertain} · 不會 {wrong}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {perfect ? '全對！太強了。' : hasIncorrect ? '把不熟的再練一次，記憶更深。' : '做得好！'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" onClick={onRestart}>
          <RotateCcw data-icon="inline-start" aria-hidden="true" />
          再練一次
        </Button>
        <Button type="button" disabled={!hasIncorrect} onClick={onReviewIncorrect}>
          <Target data-icon="inline-start" aria-hidden="true" />
          複習不熟的
        </Button>
        <Button type="button" variant="ghost" onClick={onFinish}>
          完成
        </Button>
      </div>

      {details && details.length > 0 && (
        <section aria-label="本次練習單字" className="text-left">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">本次練習的單字（點擊查看卡片）</h3>
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-sm">
            {details.map((d) => {
              const meta = VERDICT_META[d.result]
              const Icon = meta.icon
              return (
                <li key={d.card.id}>
                  <button
                    type="button"
                    onClick={() => setOpenCard(d.card)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full',
                        meta.className,
                      )}
                      title={meta.label}
                    >
                      <Icon className="size-3.5" aria-label={meta.label} />
                    </span>
                    <span className="font-medium">{d.card.front}</span>
                    <span className="ml-auto truncate pl-2 text-muted-foreground">{d.card.back}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {openCard && <WordCardDialog card={openCard} onClose={() => setOpenCard(null)} />}
    </div>
  )
}
