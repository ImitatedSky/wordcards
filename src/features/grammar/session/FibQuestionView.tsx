import { ArrowRight, Check, Lightbulb, Send, X } from 'lucide-react'
import type { FillInBlankQuestion } from '@/types/quiz'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Props = {
  question: FillInBlankQuestion
  phase: 'prompting' | 'revealed'
  text: string
  onChangeText: (value: string) => void
  grade: 'correct' | 'incorrect' | undefined
  onSubmit: () => void
  onNext: () => void
}

export function FibQuestionView({
  question,
  phase,
  text,
  onChangeText,
  grade,
  onSubmit,
  onNext,
}: Props) {
  const revealed = phase === 'revealed'
  return (
    <form
      className="mx-auto max-w-xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        if (!revealed) onSubmit()
      }}
    >
      <div className="rounded-2xl border border-border bg-card p-6 text-xl font-medium whitespace-pre-line shadow-md">
        {question.prompt}
      </div>
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium">你的答案</span>
        <Input
          aria-label="填入答案"
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          disabled={revealed}
          className={cn(
            'h-11 text-base',
            revealed && grade === 'correct' && 'border-success bg-success/5',
            revealed && grade === 'incorrect' && 'border-destructive bg-destructive/5 animate-shake',
          )}
          autoFocus
        />
      </label>
      {revealed ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <p
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium',
              grade === 'correct' ? 'text-success' : 'text-destructive',
            )}
          >
            {grade === 'correct' ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <X className="size-4" aria-hidden="true" />
            )}
            {grade === 'correct' ? '答對！' : '答錯'}
          </p>
          <p className="text-sm text-muted-foreground">可接受答案：{question.answers.join(' / ')}</p>
          {question.explanation && (
            <p className="flex items-start gap-2 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
              <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>解說：{question.explanation}</span>
            </p>
          )}
          <div className="flex justify-center pt-1">
            <Button type="button" size="lg" onClick={onNext} className="min-w-36">
              下一題
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <Button type="submit" size="lg" className="min-w-36">
            <Send data-icon="inline-start" aria-hidden="true" />
            送出
          </Button>
        </div>
      )}
    </form>
  )
}
