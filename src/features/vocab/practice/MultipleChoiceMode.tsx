import { ArrowRight, Check, X } from 'lucide-react'
import type { Card } from '@/types/deck'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  const revealed = phase === 'revealed'
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-8 text-center shadow-md">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">這個單字的意思是？</span>
        <span className="font-heading text-3xl font-bold">{card.front}</span>
      </div>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {choices.map((opt, i) => {
          const isCorrect = i === correctIndex
          const isSelected = i === selectedIndex
          const showCorrect = revealed && isCorrect
          const showWrong = revealed && isSelected && !isCorrect
          return (
            <li key={i}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => onSubmit(i)}
                className={cn(
                  'flex w-full min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium shadow-sm transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  !revealed && 'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md active:translate-y-0 active:scale-[0.99]',
                  showCorrect && 'border-success bg-success/10 text-success animate-in zoom-in-95',
                  showWrong && 'border-destructive bg-destructive/10 text-destructive animate-shake',
                  revealed && !isCorrect && !isSelected && 'opacity-50',
                )}
              >
                <span>{opt}</span>
                {showCorrect && <Check className="size-5 shrink-0" aria-label="正確答案" />}
                {showWrong && <X className="size-5 shrink-0" aria-label="答錯" />}
              </button>
            </li>
          )
        })}
      </ul>
      {revealed && (
        <div className="flex justify-center animate-in fade-in slide-in-from-bottom-2">
          <Button type="button" size="lg" onClick={onNext} className="min-w-36">
            下一題
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  )
}
