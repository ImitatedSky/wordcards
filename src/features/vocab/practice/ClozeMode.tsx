import { ArrowRight, Check, Volume2, X } from 'lucide-react'
import type { Card } from '@/types/deck'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { headwordOf } from '@/utils/headword'
import { canSpeak, speakWord } from '@/utils/speech'
import { blankExample, CLOZE_BLANK } from './clozeSampling'

type Props = {
  card: Card
  /** Example sentence with the headword replaced by CLOZE_BLANK. */
  sentence: string
  choices: string[]
  /** 中文 meaning per option — revealed alongside the answer so distractors teach too. */
  meanings?: string[]
  correctIndex: number
  selectedIndex: number | null
  phase: 'prompting' | 'revealed'
  onSubmit: (optionIndex: number) => void
  onNext: () => void
}

/** 例句填空：例句挖空，四選一選出正確單字。 */
export function ClozeMode({
  card,
  sentence,
  choices,
  meanings,
  correctIndex,
  selectedIndex,
  phase,
  onSubmit,
  onNext,
}: Props) {
  const revealed = phase === 'revealed'
  // Recover the exact removed form (may be inflected) to highlight it on reveal.
  const answerForm =
    (card.example ? blankExample(card.example, headwordOf(card))?.answer : undefined) ??
    headwordOf(card)
  const [before, after] = sentence.split(CLOZE_BLANK, 2)

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-md">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          哪個單字放進空格最合適？
        </span>
        <p lang="en" className="text-balance text-lg font-medium leading-relaxed">
          {before}
          {revealed ? (
            <mark className="rounded-md bg-success/15 px-1.5 font-bold text-success animate-in zoom-in-95">
              {answerForm}
            </mark>
          ) : (
            <span
              aria-label="空格"
              className="mx-0.5 inline-block min-w-16 border-b-2 border-dashed border-primary/60 text-center font-bold text-primary"
            >
              {' '}
            </span>
          )}
          {after}
        </p>
        {revealed && (
          <div className="flex items-center gap-2 animate-in fade-in">
            <span className="text-sm text-muted-foreground">{card.back}</span>
            {canSpeak() && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="朗讀例句"
                onClick={() => speakWord(card.example ?? headwordOf(card))}
              >
                <Volume2 aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {choices.map((opt, i) => {
          const isCorrect = i === correctIndex
          const isSelected = i === selectedIndex
          const showCorrect = revealed && isCorrect
          const showWrong = revealed && isSelected && !isCorrect
          const meaning = revealed ? meanings?.[i] : undefined
          return (
            <li key={i}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => onSubmit(i)}
                className={cn(
                  'flex w-full min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium shadow-sm transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  !revealed &&
                    'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md active:translate-y-0 active:scale-[0.99]',
                  showCorrect && 'border-success bg-success/10 text-success animate-in zoom-in-95',
                  showWrong && 'border-destructive bg-destructive/10 text-destructive animate-shake',
                  revealed && !isCorrect && !isSelected && 'opacity-60',
                )}
              >
                <span className="flex-1">
                  <span lang="en" className="block">
                    {opt}
                  </span>
                  {/* 作答後每個選項都附上中文，干擾選項也能順便複習 */}
                  {meaning && (
                    <span
                      className={cn(
                        'mt-0.5 block text-xs animate-in fade-in',
                        showCorrect
                          ? 'text-success/80'
                          : showWrong
                            ? 'text-destructive/80'
                            : 'text-muted-foreground',
                      )}
                    >
                      {meaning}
                    </span>
                  )}
                </span>
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
