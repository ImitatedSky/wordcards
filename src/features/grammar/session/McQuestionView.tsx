import { ArrowRight, Check, Lightbulb, X } from 'lucide-react'
import type { MultipleChoiceQuestion } from '@/types/quiz'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  question: MultipleChoiceQuestion
  phase: 'prompting' | 'revealed'
  selectedIndex: number | null
  onSubmit: (optionIndex: number) => void
  onNext: () => void
}

export function McQuestionView({ question, phase, selectedIndex, onSubmit, onNext }: Props) {
  const revealed = phase === 'revealed'
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 text-xl font-medium whitespace-pre-line shadow-md">
        {question.prompt}
      </div>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex
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
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {question.explanation && (
            <p className="flex items-start gap-2 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
              <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>解說：{question.explanation}</span>
            </p>
          )}
          <div className="flex justify-center">
            <Button type="button" size="lg" onClick={onNext} className="min-w-36">
              下一題
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
