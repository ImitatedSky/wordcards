import { Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  resolveSessionLimit,
  SESSION_SIZE_PCTS,
  type SessionSize,
} from './sessionLimit'

type Props = {
  /** Size of the current question pool (drives the % → count conversion). */
  total: number
  value: SessionSize
  onChange: (size: SessionSize) => void
}

/** 題目數量 field with 25/50/75/100% quick picks (default 25%) and manual
    input. Shared by vocab practice and grammar quiz setup. */
export function SessionSizeField({ total, value, onChange }: Props) {
  const display =
    value.kind === 'manual'
      ? value.value
      : total > 0
        ? String(resolveSessionLimit(value, total) ?? total)
        : ''

  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40">
      <label className="flex min-h-8 items-center gap-2.5">
        <Hash className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium">題目數量</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={total || undefined}
          value={display}
          onChange={(e) => onChange({ kind: 'manual', value: e.target.value })}
          placeholder={`全部（${total}）`}
          aria-label="題目數量"
          className="ml-auto w-28 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <div role="group" aria-label="題目數量快捷選擇" className="grid grid-cols-4 gap-1.5">
        {SESSION_SIZE_PCTS.map((pct) => {
          const active = value.kind === 'pct' && value.pct === pct
          return (
            <button
              key={pct}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ kind: 'pct', pct })}
              className={cn(
                'min-h-9 rounded-lg border text-sm font-medium tabular-nums transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {pct}%
            </button>
          )
        })}
      </div>
    </div>
  )
}
