import { useMemo, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import type { Card } from '@/types/deck'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { headwordOf } from '@/utils/headword'
import type { FlipResult } from './usePracticeSession'

type Props = {
  /** The 3~5 cards of this matching chunk. */
  cards: Card[]
  /** Fires once, when the last pair locks: per-card verdicts. */
  onComplete: (results: Record<string, FlipResult>) => void
  onNext: () => void
  /** Label for the advance button (最後一組顯示「看結果」). */
  isLast: boolean
}

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** 配對模式：左欄英文、右欄打亂的中文，點兩邊配對。
    配錯閃紅可重試；某一對曾配錯，該單字記「答錯」。 */
export function MatchMode({ cards, onComplete, onNext, isLast }: Props) {
  // Right column: the 中文 sides, shuffled once per chunk.
  const rightItems = useMemo(() => shuffled(cards.map((c) => ({ id: c.id, back: c.back }))), [cards])

  const [leftSel, setLeftSel] = useState<string | null>(null)
  const [rightSel, setRightSel] = useState<string | null>(null)
  const [lockedLeft, setLockedLeft] = useState<ReadonlySet<string>>(new Set())
  const [lockedRight, setLockedRight] = useState<ReadonlySet<string>>(new Set())
  // Wrong flash: the most recent mismatched pair (cleared on the next tap).
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null)
  // Left cards that have been mismatched at least once → 記答錯.
  const [missed, setMissed] = useState<ReadonlySet<string>>(new Set())

  const done = lockedLeft.size === cards.length
  const correctCount = cards.filter((c) => !missed.has(c.id)).length

  function tryMatch(leftId: string | null, rightId: string | null) {
    if (leftId == null || rightId == null) return
    const leftCard = cards.find((c) => c.id === leftId)!
    const rightItem = rightItems.find((r) => r.id === rightId)!
    // Compare by meaning text, so duplicate 中文 across cards matches either way.
    if (leftCard.back === rightItem.back) {
      const nextLeft = new Set(lockedLeft).add(leftId)
      const nextRight = new Set(lockedRight).add(rightId)
      setLockedLeft(nextLeft)
      setLockedRight(nextRight)
      setLeftSel(null)
      setRightSel(null)
      if (nextLeft.size === cards.length) {
        const results: Record<string, FlipResult> = {}
        for (const c of cards) results[c.id] = missed.has(c.id) ? 'incorrect' : 'correct'
        onComplete(results)
      }
    } else {
      setMissed((prev) => new Set(prev).add(leftId))
      setWrong({ left: leftId, right: rightId })
      setLeftSel(null)
      setRightSel(null)
    }
  }

  function pickLeft(id: string) {
    setWrong(null)
    const next = leftSel === id ? null : id
    setLeftSel(next)
    tryMatch(next, rightSel)
  }

  function pickRight(id: string) {
    setWrong(null)
    const next = rightSel === id ? null : id
    setRightSel(next)
    tryMatch(leftSel, next)
  }

  const itemClass = (opts: { locked: boolean; selected: boolean; wrong: boolean }) =>
    cn(
      'flex w-full min-h-12 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-medium shadow-sm transition-all',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      opts.locked
        ? 'cursor-default border-success bg-success/10 text-success'
        : opts.wrong
          ? 'border-destructive bg-destructive/10 text-destructive animate-shake'
          : opts.selected
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md active:translate-y-0',
    )

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          點選左右兩邊，把英文和中文配成對
        </span>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {lockedLeft.size} / {cards.length} 對
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ul className="space-y-2.5" aria-label="英文">
          {cards.map((c) => {
            const locked = lockedLeft.has(c.id)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  lang="en"
                  disabled={locked}
                  aria-pressed={leftSel === c.id}
                  onClick={() => pickLeft(c.id)}
                  className={itemClass({
                    locked,
                    selected: leftSel === c.id,
                    wrong: wrong?.left === c.id,
                  })}
                >
                  {headwordOf(c)}
                  {locked && <Check className="ml-1.5 size-4 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
        <ul className="space-y-2.5" aria-label="中文">
          {rightItems.map((r) => {
            const locked = lockedRight.has(r.id)
            return (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={locked}
                  aria-pressed={rightSel === r.id}
                  onClick={() => pickRight(r.id)}
                  className={itemClass({
                    locked,
                    selected: rightSel === r.id,
                    wrong: wrong?.right === r.id,
                  })}
                >
                  {r.back}
                  {locked && <Check className="ml-1.5 size-4 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {done && (
        <div className="space-y-3 text-center animate-in fade-in slide-in-from-bottom-2">
          <p className="text-sm font-medium tabular-nums">
            本組完成：一次配對 {correctCount} / {cards.length}
          </p>
          <Button type="button" size="lg" onClick={onNext} className="min-w-36">
            {isLast ? '看結果' : '下一組'}
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  )
}
