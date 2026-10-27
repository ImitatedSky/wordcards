import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import type { Card } from '@/types/deck'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { headwordOf } from '@/utils/headword'
import type { FlipResult } from './usePracticeSession'

type Props = {
  card: Card
  choices: string[]
  correctIndex: number
  phase: 'prompting' | 'revealed'
  /** 第一次就選對 = correct；中途選錯過 = incorrect（最後仍要選對才能過） */
  onSubmit: (result: FlipResult) => void
  onNext: () => void
}

function sameLetter(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase()
}

function shuffled(arr: number[]): number[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** 拼字選義：照著灰字打出單字，再從中文選項選出意思；選錯就重打單字再選一次。 */
export function SpellMode({ card, choices, correctIndex, phase, onSubmit, onNext }: Props) {
  const target = headwordOf(card)
  const [stage, setStage] = useState<'type' | 'choose'>('type')
  const [typed, setTyped] = useState('')
  const [order, setOrder] = useState(() => choices.map((_, i) => i))
  const [wrongPick, setWrongPick] = useState<string | null>(null)
  const revealed = phase === 'revealed'

  function handleType(value: string) {
    setTyped(value)
    if (value.length === target.length && [...value].every((ch, i) => sameLetter(ch, target[i]))) {
      setStage('choose')
    }
  }

  function handlePick(i: number) {
    if (i === correctIndex) {
      onSubmit(wrongPick == null ? 'correct' : 'incorrect')
      return
    }
    setWrongPick(choices[i])
    setTyped('')
    // 重排選項，回來時不能只靠「剛剛那個位置不是」來猜
    setOrder(shuffled(order))
    setStage('type')
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-md">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {stage === 'type' && !revealed ? '照著灰字打出單字' : '這個單字的意思是？'}
        </span>
        {/* 灰字是提示，打對的字母變深、打錯的變紅 */}
        <span lang="en" aria-hidden="true" className="font-heading text-3xl font-bold tracking-wide">
          {[...target].map((ch, i) => {
            const t = typed[i]
            const done = stage === 'choose' || revealed
            return (
              <span
                key={i}
                className={cn(
                  done || (t != null && sameLetter(t, ch))
                    ? 'text-foreground'
                    : t != null
                      ? 'text-destructive'
                      : 'text-muted-foreground/35',
                )}
              >
                {ch}
              </span>
            )
          })}
        </span>
        {stage === 'type' && !revealed && (
          <input
            type="text"
            value={typed}
            onChange={(e) => handleType(e.target.value)}
            maxLength={target.length}
            autoFocus
            aria-label={`輸入單字 ${target}`}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            lang="en"
            className="mt-1 w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-center text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
        {wrongPick != null && stage === 'type' && !revealed && (
          <p role="alert" className="text-sm text-destructive">
            「{wrongPick}」不對，再打一次單字後重選
          </p>
        )}
      </div>

      {(stage === 'choose' || revealed) && (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {order.map((i) => {
            const isCorrect = i === correctIndex
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={revealed}
                  onClick={() => handlePick(i)}
                  className={cn(
                    'flex w-full min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium shadow-sm transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    !revealed &&
                      'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md active:translate-y-0 active:scale-[0.99]',
                    revealed && isCorrect && 'border-success bg-success/10 text-success animate-in zoom-in-95',
                    revealed && !isCorrect && 'opacity-50',
                  )}
                >
                  <span>{choices[i]}</span>
                  {revealed && isCorrect && <Check className="size-5 shrink-0" aria-label="正確答案" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {revealed && (
        <div className="flex justify-center animate-in fade-in slide-in-from-bottom-2">
          {/* 自動聚焦，打字的人按 Enter 就能到下一題 */}
          <Button type="button" size="lg" onClick={onNext} autoFocus className="min-w-36">
            下一題
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  )
}
