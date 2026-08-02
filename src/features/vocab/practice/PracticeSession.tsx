import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, ListChecks, Percent, Play, Shuffle, Tag as TagIcon, TextCursorInput, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTags } from '@/features/tags/hooks'
import { useDecks } from '../hooks'
import { DEFAULT_SESSION_SIZE, resolveSessionLimit, type SessionSize } from './sessionLimit'
import { SessionSizeField } from './SessionSizeField'
import { splitCounts, usePracticeSession, type PracticeMode } from './usePracticeSession'
import { FlipMode } from './FlipMode'
import { MultipleChoiceMode } from './MultipleChoiceMode'
import { ClozeMode } from './ClozeMode'
import { ResultsSummary } from './ResultsSummary'

type Props = {
  deckId: string
}

type Phase =
  | { kind: 'pre' }
  | {
      kind: 'running'
      deckIds: string[]
      modes: PracticeMode[]
      modeRatio: number
      shuffle: boolean
      limit?: number
      tagIds: string[]
    }

// Adding a future mode = one more entry here; the ratio UI covers two modes,
// three or more split into equal consecutive segments.
const MODE_META = [
  { value: 'flip', label: '翻牌 (自評)', desc: '看正面回想意思，自評會不會', icon: Layers },
  { value: 'multiple_choice', label: '選擇題', desc: '四選一，即時對答案', icon: ListChecks },
  { value: 'cloze', label: '例句填空', desc: '例句挖空，選出正確單字（無例句的字自動改出選擇題）', icon: TextCursorInput },
] as const

const RATIO_OPTIONS = [25, 50, 75] as const

export function PracticeSession({ deckId }: Props) {
  const navigate = useNavigate()
  const { decks, loading } = useDecks()
  const { tags } = useTags()
  const [phase, setPhase] = useState<Phase>({ kind: 'pre' })
  // Selection order matters: the first-selected mode runs first and owns the ratio.
  const [selectedModes, setSelectedModes] = useState<PracticeMode[]>(['flip'])
  const [ratioPct, setRatioPct] = useState<number>(50)
  const [shuffle, setShuffle] = useState(true)
  const [size, setSize] = useState<SessionSize>(DEFAULT_SESSION_SIZE)
  // The deck the user came from starts selected; more can be added.
  const [selectedIds, setSelectedIds] = useState<string[]>([deckId])
  // Tag filter: empty = practice everything.
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  if (phase.kind === 'pre') {
    const selectedDecks = decks.filter((d) => selectedIds.includes(d.id))
    const pooledCards = selectedDecks.flatMap((d) => d.cards)
    // Cards carrying at least one selected tag (mirrors usePracticeSession's filter).
    const totalCards =
      selectedTagIds.length === 0
        ? pooledCards.length
        : pooledCards.filter((c) => c.tags.some((t) => selectedTagIds.includes(t))).length
    const effectiveTotal = resolveSessionLimit(size, totalCards) ?? totalCards
    const [firstCount, secondCount] = splitCounts(effectiveTotal, ratioPct / 100)
    const modeLabel = (m: PracticeMode) => MODE_META.find((x) => x.value === m)!.label

    function toggleDeck(id: string) {
      setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
    }

    function toggleMode(m: PracticeMode) {
      setSelectedModes((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
    }

    function toggleTag(id: string) {
      setSelectedTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
    }

    return (
      <div className="mx-auto max-w-md space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">練習設定</h1>
          <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
            已選 {selectedDecks.length} 副牌組 · 共 {totalCards} 張單字卡
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">牌組（可複選）</legend>
          {loading ? (
            <div className="h-12 animate-pulse rounded-xl bg-muted" aria-hidden="true" />
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {decks.map((d) => {
                const checked = selectedIds.includes(d.id)
                return (
                  <li key={d.id}>
                    <label
                      className={cn(
                        'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-all',
                        'has-focus-visible:ring-2 has-focus-visible:ring-ring',
                        checked
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/40',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDeck(d.id)}
                        aria-label={`牌組 ${d.name}`}
                        className="size-4 accent-[var(--primary)]"
                      />
                      <span className={cn('flex-1 truncate text-sm font-medium', checked && 'text-primary')}>
                        {d.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {d.cards.length} 張
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <TagIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            標籤篩選（可複選，不選＝全部單字）
          </legend>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const checked = selectedTagIds.includes(t.id)
              const count = pooledCards.filter((c) => c.tags.includes(t.id)).length
              return (
                <button
                  key={t.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={`標籤 ${t.name}`}
                  disabled={count === 0 && !checked}
                  onClick={() => toggleTag(t.id)}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    checked
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {t.icon && <span aria-hidden="true">{t.icon}</span>}
                  <span>{t.name}</span>
                  <span className="text-xs tabular-nums opacity-70">{count}</span>
                </button>
              )
            })}
          </div>
          {selectedTagIds.length > 0 && (
            <p className="text-xs text-muted-foreground tabular-nums">
              符合標籤的單字：{totalCards} 張
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">模式（可複選，依點選順序出題）</legend>
          {MODE_META.map(({ value, label, desc, icon: Icon }) => {
            const order = selectedModes.indexOf(value)
            const checked = order >= 0
            return (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all',
                  'has-focus-visible:ring-2 has-focus-visible:ring-ring',
                  checked
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-primary/40',
                )}
              >
                <input
                  type="checkbox"
                  aria-label={label}
                  checked={checked}
                  onChange={() => toggleMode(value)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    checked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className={cn('block text-sm font-medium', checked && 'text-primary')}>{label}</span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
                {checked && selectedModes.length > 1 && (
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                    aria-label={`第 ${order + 1} 順位`}
                  >
                    {order + 1}
                  </span>
                )}
              </label>
            )
          })}
        </fieldset>

        {selectedModes.length === 2 && (
          <fieldset className="space-y-2 rounded-xl border border-border bg-card p-4">
            <legend className="flex items-center gap-1.5 px-1 text-sm font-medium">
              <Percent className="size-4 text-muted-foreground" aria-hidden="true" />
              模式比例（第一順位所佔比例）
            </legend>
            <div role="radiogroup" aria-label="模式比例" className="grid grid-cols-3 gap-2">
              {RATIO_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  role="radio"
                  aria-checked={ratioPct === pct}
                  onClick={() => setRatioPct(pct)}
                  className={cn(
                    'min-h-10 rounded-lg border text-sm font-medium tabular-nums transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    ratioPct === pct
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {effectiveTotal > 0
                ? `${modeLabel(selectedModes[0])} 前 ${firstCount} 題 → ${modeLabel(selectedModes[1])} 後 ${secondCount} 題`
                : '選擇牌組後顯示題數分配'}
            </p>
          </fieldset>
        )}

        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40">
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          <Shuffle className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium">隨機出題</span>
        </label>

        <SessionSizeField total={totalCards} value={size} onChange={setSize} />

        <Button
          type="button"
          size="lg"
          disabled={totalCards === 0 || selectedModes.length === 0}
          onClick={() =>
            setPhase({
              kind: 'running',
              deckIds: selectedIds,
              modes: selectedModes,
              modeRatio: ratioPct / 100,
              shuffle,
              limit: resolveSessionLimit(size, totalCards),
              tagIds: selectedTagIds,
            })
          }
          className="w-full"
        >
          <Play data-icon="inline-start" aria-hidden="true" />
          開始
        </Button>
      </div>
    )
  }

  return (
    <RunningSession
      deckIds={phase.deckIds}
      modes={phase.modes}
      modeRatio={phase.modeRatio}
      shuffle={phase.shuffle}
      limit={phase.limit}
      tagIds={phase.tagIds}
      onExit={() => navigate(`/vocab/${deckId}`)}
    />
  )
}

function RunningSession({
  deckIds,
  modes,
  modeRatio,
  shuffle,
  limit,
  tagIds,
  onExit,
}: {
  deckIds: string[]
  modes: PracticeMode[]
  modeRatio: number
  shuffle: boolean
  limit?: number
  tagIds: string[]
  onExit: () => void
}) {
  const { state, cards, submit, next, restart, reviewIncorrect } = usePracticeSession(deckIds, {
    modes,
    modeRatio,
    shuffle,
    limit,
    tagIds,
  })

  if (state.phase === 'loading') {
    return (
      <div className="mx-auto max-w-xl space-y-4" aria-label="載入中">
        <div className="h-2 animate-pulse rounded-full bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (state.phase === 'finished') {
    const results = Object.values(state.answers)
    const total = results.length
    const correct = results.filter((r) => r === 'correct').length
    const uncertain = results.filter((r) => r === 'uncertain').length
    const hasIncorrect = total - correct > 0
    // Per-word list in practice order, so the user sees exactly what was drilled
    const details = state.queue.flatMap((cardId) => {
      const c = cards.find((card) => card.id === cardId)
      const result = state.answers[cardId]
      return c && result ? [{ card: c, result }] : []
    })
    return (
      <ResultsSummary
        correct={correct}
        total={total}
        uncertain={uncertain}
        hasIncorrect={hasIncorrect}
        details={details}
        onRestart={restart}
        onReviewIncorrect={reviewIncorrect}
        onFinish={onExit}
      />
    )
  }

  const card = cards.find((c) => c.id === state.queue[state.index])
  if (!card) {
    return <p className="text-center text-muted-foreground">找不到單字。</p>
  }

  const position = state.index + 1
  const total = state.queue.length

  return (
    <div className="space-y-6">
      {/* Session progress */}
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div
          role="progressbar"
          aria-label="練習進度"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={position}
          aria-valuetext={`${position} / ${total}`}
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${(position / total) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          {position} / {total}
        </span>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="結束練習" onClick={onExit}>
          <X aria-hidden="true" />
        </Button>
      </div>

      {state.queueModes[state.index] === 'flip' ? (
        <FlipMode
          card={card}
          phase={state.phase}
          onSubmit={(r) => void submit({ kind: 'flip', result: r })}
          onNext={next}
        />
      ) : (
        <McSessionView
          key={card.id}
          card={card}
          choices={state.mcChoices!}
          correctIndex={state.mcCorrectIndex!}
          clozeSentence={state.clozeSentence}
          clozeMeanings={state.clozeMeanings}
          phase={state.phase}
          onSubmit={(i) => void submit({ kind: 'mc', optionIndex: i })}
          onNext={next}
        />
      )}
    </div>
  )
}

function McSessionView(props: {
  card: import('@/types/deck').Card
  choices: string[]
  correctIndex: number
  /** Present when this position is a cloze question (例句填空). */
  clozeSentence?: string
  /** 中文 meaning per option, shown after answering. */
  clozeMeanings?: string[]
  phase: 'prompting' | 'revealed' | 'loading' | 'finished'
  onSubmit: (i: number) => void
  onNext: () => void
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  function handleSubmit(i: number) {
    setSelectedIndex(i)
    props.onSubmit(i)
  }
  function handleNext() {
    setSelectedIndex(null)
    props.onNext()
  }
  if (props.phase !== 'prompting' && props.phase !== 'revealed') return null
  if (props.clozeSentence) {
    return (
      <ClozeMode
        card={props.card}
        sentence={props.clozeSentence}
        choices={props.choices}
        meanings={props.clozeMeanings}
        correctIndex={props.correctIndex}
        selectedIndex={selectedIndex}
        phase={props.phase}
        onSubmit={handleSubmit}
        onNext={handleNext}
      />
    )
  }
  return (
    <MultipleChoiceMode
      card={props.card}
      choices={props.choices}
      correctIndex={props.correctIndex}
      selectedIndex={selectedIndex}
      phase={props.phase}
      onSubmit={handleSubmit}
      onNext={handleNext}
    />
  )
}
