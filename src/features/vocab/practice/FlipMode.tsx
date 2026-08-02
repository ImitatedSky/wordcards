import { useRef, useState } from 'react'
import { ArrowRight, Check, CircleHelp, Volume2, X } from 'lucide-react'
import type { Card } from '@/types/deck'
import { Button } from '@/components/ui/button'
import { headwordOf } from '@/utils/headword'
import { canSpeak, speakWord } from '@/utils/speech'
import { cn } from '@/lib/utils'
import type { FlipResult } from './usePracticeSession'

type Props = {
  card: Card
  phase: 'prompting' | 'revealed'
  onSubmit: (result: FlipResult) => void
  onNext: () => void
}

const SWIPE_THRESHOLD = 80

/** Drag direction → verdict: right = 會, left = 不會, up = 不確定. */
function verdictOf(dx: number, dy: number): FlipResult | null {
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= SWIPE_THRESHOLD) return 'correct'
    if (dx <= -SWIPE_THRESHOLD) return 'incorrect'
    return null
  }
  return dy <= -SWIPE_THRESHOLD ? 'uncertain' : null
}

export function FlipMode({ card, phase, onSubmit, onNext }: Props) {
  const revealed = phase === 'revealed'
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)

  // Hint while dragging, before release
  const hint = drag ? verdictOf(drag.dx, drag.dy) : null

  function handlePointerDown(e: React.PointerEvent) {
    if (revealed) return
    startRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ dx: 0, dy: 0 })
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!startRef.current) return
    setDrag({ dx: e.clientX - startRef.current.x, dy: e.clientY - startRef.current.y })
  }

  function handlePointerUp() {
    if (!startRef.current || !drag) return
    const verdict = verdictOf(drag.dx, drag.dy)
    startRef.current = null
    setDrag(null)
    if (verdict) onSubmit(verdict)
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Draggable 3D flip card */}
      <div
        className={cn('relative touch-none select-none', !revealed && 'cursor-grab active:cursor-grabbing')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          translate: drag ? `${drag.dx}px ${drag.dy}px` : '0 0',
          rotate: drag ? `${drag.dx * 0.04}deg` : '0deg',
          transition: drag ? 'none' : 'translate 200ms ease-out, rotate 200ms ease-out',
        }}
      >
        {/* Direction hints while dragging */}
        {hint === 'correct' && (
          <span className="absolute -top-3 right-2 z-10 flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-bold text-success-foreground">
            <Check className="size-3.5" aria-hidden="true" /> 會
          </span>
        )}
        {hint === 'incorrect' && (
          <span className="absolute -top-3 left-2 z-10 flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground">
            <X className="size-3.5" aria-hidden="true" /> 不會
          </span>
        )}
        {hint === 'uncertain' && (
          <span className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-chart-3 px-2.5 py-1 text-xs font-bold text-foreground">
            <CircleHelp className="size-3.5" aria-hidden="true" /> 不確定
          </span>
        )}

        <div className="perspective-distant">
          {/* Fixed height keeps the button row at the same Y in both phases;
              long back content scrolls inside the card instead. */}
          <div
            className={cn(
              'grid h-64 transform-3d transition-transform duration-250 ease-out motion-reduce:transition-none sm:h-72',
              revealed && 'rotate-y-180',
            )}
          >
            {/* Front */}
            <div className="overflow-y-auto rounded-2xl border border-border bg-card shadow-md backface-hidden [grid-area:1/1]">
              <div className="flex min-h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">正面</span>
                <span className="flex items-center gap-1.5 font-heading text-3xl font-bold">
                  {card.front}
                  {canSpeak() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="唸出單字"
                      onClick={(e) => {
                        e.stopPropagation()
                        speakWord(headwordOf(card))
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="shrink-0 text-primary hover:bg-primary/10"
                    >
                      <Volume2 aria-hidden="true" />
                    </Button>
                  )}
                </span>
                {card.pronunciation && <span className="text-sm text-muted-foreground">{card.pronunciation}</span>}
              </div>
            </div>
            {/* Back */}
            <div className="rotate-y-180 overflow-y-auto rounded-2xl border border-primary/30 bg-card shadow-md backface-hidden [grid-area:1/1]">
              <div className="flex min-h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <span className="text-xs font-medium uppercase tracking-widest text-primary">背面</span>
                <span className="text-2xl font-semibold">{card.back}</span>
                {card.example && <p className="mt-1 text-sm italic text-muted-foreground">{card.example}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Always occupies its line so the buttons below never shift */}
      <p className={cn('text-center text-sm text-muted-foreground', revealed && 'invisible')}>
        自評後顯示背面 — 也可以直接拖卡片：<span className="text-destructive">← 不會</span>
        <span className="mx-1 text-foreground/70">↑ 不確定</span>
        <span className="text-success">會 →</span>
      </p>

      {/* One shared grid row: verdicts and 下一題 sit at the same level,
          下一題 spans the full row width. */}
      <div className="grid grid-cols-3 gap-3">
        {phase === 'prompting' ? (
          <>
            <Button type="button" size="lg" variant="destructive" onClick={() => onSubmit('incorrect')}>
              <X data-icon="inline-start" aria-hidden="true" />
              不會
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => onSubmit('uncertain')}
              className="border-chart-3/60 text-foreground/80 hover:bg-chart-3/10"
            >
              <CircleHelp data-icon="inline-start" aria-hidden="true" />
              不確定
            </Button>
            <Button type="button" size="lg" onClick={() => onSubmit('correct')} className="bg-success text-success-foreground hover:bg-success/85">
              <Check data-icon="inline-start" aria-hidden="true" />
              會
            </Button>
          </>
        ) : (
          <Button type="button" size="lg" onClick={onNext} className="col-span-3 w-full">
            下一題
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}
