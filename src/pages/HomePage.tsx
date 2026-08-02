import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, GraduationCap, Layers, Play, WholeWord } from 'lucide-react'
import type { Deck } from '@/types/deck'
import { FloatingWords, type FloatingWordItem } from '@/components/common/FloatingWords'
import { useDecks } from '@/features/vocab/hooks'
import { cn } from '@/lib/utils'

/** Full word pool, round-robin across decks so early slots mix all decks.
    FloatingWords shows a capped number at once and draws replacements from
    the rest as words fly off. */
function buildWordPool(decks: Deck[]): FloatingWordItem[] {
  const items: FloatingWordItem[] = []
  const withCards = decks.filter((d) => d.cards.length > 0)
  const maxLen = Math.max(0, ...withCards.map((d) => d.cards.length))
  for (let round = 0; round < maxLen; round++) {
    for (const deck of withCards) {
      const card = deck.cards[round]
      if (card) items.push({ card, deckId: deck.id, deckName: deck.name })
    }
  }
  return items
}

function StatCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Layers
  label: string
  value: number
  className?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', className)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <div className="text-2xl font-bold tabular-nums leading-tight">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

export function HomePage() {
  const { decks, loading } = useDecks()

  const deckCount = decks.length
  const cardCount = decks.reduce((sum, d) => sum + d.cards.length, 0)
  // decks are sorted by updatedAt desc — first deck with cards is the practice target
  const continueDeck = decks.find((d) => d.cards.length > 0)
  const wordPool = buildWordPool(decks)

  return (
    // Full-bleed positioning context so the floating words roam the whole
    // visible page, not just the content column (header 3.5rem + main pb).
    <div className="relative min-h-[calc(100dvh-8.5rem)] overflow-x-clip md:min-h-[calc(100dvh-6rem)]">
      <div className="relative z-10 mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
      <section className="space-y-1 pt-2">
        <h1 className="text-3xl font-bold tracking-tight">
          歡迎回來<span className="text-primary">。</span>
        </h1>
        <p className="text-muted-foreground">今天也來累積一點雅思單字量吧。</p>
      </section>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
          <div className="h-[74px] animate-pulse rounded-xl bg-muted" />
          <div className="h-[74px] animate-pulse rounded-xl bg-muted" />
        </div>
      ) : (
        <>
          <section aria-label="學習統計" className="grid gap-3 sm:grid-cols-2">
            <StatCard icon={Layers} label="牌組" value={deckCount} className="bg-primary/10 text-primary" />
            <StatCard icon={WholeWord} label="單字卡" value={cardCount} className="bg-success/10 text-success" />
          </section>

          {continueDeck ? (
            <section>
              <Link
                to={`/vocab/${continueDeck.id}/practice`}
                className="group flex items-center justify-between gap-4 rounded-xl bg-primary p-5 text-primary-foreground shadow-md transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="flex items-center gap-4">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary-foreground/15">
                    <Play className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="font-heading text-lg font-semibold">繼續練習</div>
                    <div className="text-sm opacity-90">
                      {continueDeck.name} · {continueDeck.cards.length} 張單字卡
                    </div>
                  </div>
                </div>
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <p className="font-medium">還沒有牌組</p>
              <p className="mt-1 text-sm text-muted-foreground">
                先到
                <Link to="/vocab" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">
                  單字頁
                </Link>
                建立或匯入第一副牌組，開始你的學習旅程。
              </p>
            </section>
          )}
        </>
      )}

      <section aria-label="功能入口" className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/vocab"
          className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <div className="font-heading font-semibold">單字卡</div>
          <div className="mt-0.5 text-sm text-muted-foreground">管理牌組並練習：翻卡與選擇題模式</div>
        </Link>
        <Link
          to="/grammar"
          className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <GraduationCap className="size-5" aria-hidden="true" />
          </span>
          <div className="font-heading font-semibold">文法測驗</div>
          <div className="mt-0.5 text-sm text-muted-foreground">管理題組並作答：選擇與填空題型</div>
        </Link>
      </section>
      </div>

      {/* Decorative floating vocabulary — after content in DOM so tab order hits content first */}
      {wordPool.length > 0 && <FloatingWords pool={wordPool} />}
    </div>
  )
}
