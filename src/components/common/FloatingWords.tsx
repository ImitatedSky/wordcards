import { useState } from 'react'
import type { Card } from '@/types/deck'
import { WordCardDialog } from '@/components/common/WordCardDialog'
import { headwordOf } from '@/utils/headword'
import { cn } from '@/lib/utils'

export type FloatingWordItem = {
  card: Card
  deckId: string
  deckName: string
}

/** Deterministic pseudo-random in [0, 1) from a string seed — stable per word. */
function hash01(seed: string, salt: number): number {
  let h = salt * 0x9e3779b9
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x85ebca6b)
    h ^= h >>> 13
  }
  return ((h >>> 0) % 10000) / 10000
}

type Slot = {
  /** Unique per spawn — remounts the element so its flight restarts. */
  key: number
  item: FloatingWordItem
  /** Seed string driving this spawn's position/speed/direction. */
  seed: string
}

let nextKey = 1

function makeSlot(item: FloatingWordItem, seed: string): Slot {
  return { key: nextKey++, item, seed }
}

/**
 * Decorative floating-word layer for the dashboard background.
 * Words fade in, fly outward (spinning 360°) until they leave the page, then
 * a fresh random word from the pool takes the vacated slot. Hover/focus
 * pauses a word; clicking opens its flashcard. Under reduced motion the
 * layer is static and words do not cycle. Rendered after the page content
 * in DOM order so keyboard focus reaches the real content first.
 */
export function FloatingWords({ pool, maxWords = 18 }: { pool: FloatingWordItem[]; maxWords?: number }) {
  const [selected, setSelected] = useState<FloatingWordItem | null>(null)
  const [slots, setSlots] = useState<Slot[]>(() =>
    pool.slice(0, maxWords).map((item) => makeSlot(item, item.card.id)),
  )
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /** Replace a departed word with a random pool entry not currently shown. */
  function respawn(slotKey: number) {
    setSlots((prev) => {
      const activeIds = new Set(prev.filter((s) => s.key !== slotKey).map((s) => s.item.card.id))
      const candidates = pool.filter((p) => !activeIds.has(p.card.id))
      const pickFrom = candidates.length > 0 ? candidates : pool
      const item = pickFrom[Math.floor(Math.random() * pickFrom.length)]
      // Random seed → new position, direction, and speed for the newcomer.
      const seed = `${item.card.id}:${Math.random().toString(36).slice(2, 8)}`
      return prev.map((s) => (s.key === slotKey ? makeSlot(item, seed) : s))
    })
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden">
        {slots.map((slot, i) => {
          const { item, seed } = slot
          // Spawn point spread across the full layer.
          const left = 3 + hash01(seed, 1) * 84
          const top = 5 + hash01(seed, 2) * 80
          // One-way flight: random direction, far enough to leave the page.
          const angle = hash01(seed, 3) * Math.PI * 2
          const flyX = Math.cos(angle) * (45 + hash01(seed, 4) * 40) // vw
          const flyY = Math.sin(angle) * (35 + hash01(seed, 5) * 30) // vh
          const flyDuration = 14 + hash01(seed, 6) * 18 // 14s – 32s
          const spinDuration = 6 + hash01(seed, 7) * 30 // 6s – 36s
          const spinEase = hash01(seed, 8) > 0.5 ? 'ease-in-out' : 'linear'
          // First-generation words start mid-flight (negative delay) so the
          // initial swarm is staggered; respawned words start from zero.
          const isRespawn = seed.includes(':')
          const flyDelay = isRespawn ? 0 : -(hash01(seed, 10) * flyDuration * 0.8)
          // Size tiers: a few headliners, plenty of mid-size, some small.
          const sizeRoll = hash01(seed, 9)
          const sizeClass =
            sizeRoll > 0.85 ? 'text-2xl' : sizeRoll > 0.55 ? 'text-xl' : sizeRoll > 0.25 ? 'text-lg' : 'text-base'
          return (
            <button
              key={slot.key}
              type="button"
              onClick={() => setSelected(item)}
              onAnimationEnd={(e) => {
                if (e.animationName === 'word-fly' && !reducedMotion) respawn(slot.key)
              }}
              aria-label={`單字：${headwordOf(item.card)}`}
              className={cn(
                'pointer-events-auto absolute rounded-lg px-2 py-1 font-heading font-semibold',
                !reducedMotion && 'animate-float-word',
                sizeClass,
                'text-muted-foreground transition-colors duration-200',
                'hover:z-10 hover:bg-card hover:text-primary hover:shadow-md hover:[animation-play-state:paused]',
                'focus-visible:z-10 focus-visible:bg-card focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:[animation-play-state:paused]',
                i >= 8 && 'hidden sm:block', // fewer words on small screens
              )}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                '--fly-x': `${flyX.toFixed(1)}vw`,
                '--fly-y': `${flyY.toFixed(1)}vh`,
                '--float-fly-duration': `${flyDuration.toFixed(1)}s`,
                '--float-spin-duration': `${spinDuration.toFixed(1)}s`,
                '--float-spin-ease': spinEase,
                animationDelay: `${flyDelay.toFixed(1)}s, ${flyDelay.toFixed(1)}s`,
              } as React.CSSProperties}
            >
              {headwordOf(item.card)}
            </button>
          )
        })}
      </div>

      {selected && (
        <WordCardDialog
          card={selected.card}
          deckName={selected.deckName}
          practiceTo={`/vocab/${selected.deckId}/practice`}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
