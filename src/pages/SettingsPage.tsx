import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'
import { TagManager } from '@/features/tags/TagManager'
import { ConstructionBadge } from '@/components/common/ConstructionBadge'
import {
  getCardDisplayPrefs,
  setCardDisplayPrefs,
  type CardDisplayLevel,
  type CardDisplayPrefs,
} from '@/utils/cardDisplayPrefs'
import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  { value: 'light', label: '淺色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟隨系統', icon: Monitor },
] as const

function ThemeSection() {
  // Client-only SPA: theme is undefined only for the very first render.
  const { theme, setTheme } = useTheme()

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">外觀主題</h2>
      <div role="radiogroup" aria-label="外觀主題" className="grid grid-cols-3 gap-2 max-w-md">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = theme === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={cn(
                'flex min-h-11 flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

const LEVEL_OPTIONS: Array<{ value: CardDisplayLevel; label: string }> = [
  { value: 'sm', label: '小' },
  { value: 'md', label: '中' },
  { value: 'lg', label: '大' },
]

function LevelPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: CardDisplayLevel
  onChange: (level: CardDisplayLevel) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
        {LEVEL_OPTIONS.map(({ value: v, label: l }) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={`${label} ${l}`}
            onClick={() => onChange(v)}
            className={cn(
              'min-w-11 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              value === v ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

function CardDisplaySection() {
  const [prefs, setPrefs] = useState<CardDisplayPrefs>(getCardDisplayPrefs)

  function update(patch: Partial<CardDisplayPrefs>) {
    setPrefs(setCardDisplayPrefs(patch))
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">單字卡顯示</h2>
      <p className="text-sm text-muted-foreground">調整開啟單字卡時的視窗大小與字體大小，方便閱讀。</p>
      <div className="max-w-md space-y-3 rounded-xl border border-border bg-card p-4">
        <LevelPicker label="卡片大小" value={prefs.size} onChange={(size) => update({ size })} />
        <LevelPicker
          label="字體大小"
          value={prefs.fontSize}
          onChange={(fontSize) => update({ fontSize })}
        />
      </div>
    </section>
  )
}

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
      <h1 className="text-2xl font-bold tracking-tight">設定</h1>

      <ThemeSection />

      <CardDisplaySection />

      <TagManager />

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          匯出全部資料 <ConstructionBadge />
        </h2>
        <p className="text-sm text-muted-foreground">匯出功能將在後續計畫實作。</p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          雲端同步 <ConstructionBadge />
        </h2>
        <p className="text-sm text-muted-foreground">未來版本推出。</p>
      </section>
    </div>
  )
}
