/** Parse the 題目數量 field: '' → practice all; otherwise clamp to [1, max]. */
export function parseSessionLimit(raw: string, max: number): number | undefined {
  if (raw.trim() === '') return undefined
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return undefined
  return Math.min(Math.floor(n), max)
}

export const SESSION_SIZE_PCTS = [25, 50, 75, 100] as const
export type SessionSizePct = (typeof SESSION_SIZE_PCTS)[number]

/** Session size: a quick percentage of the pool, or a manually typed count. */
export type SessionSize =
  | { kind: 'pct'; pct: SessionSizePct }
  | { kind: 'manual'; value: string }

export const DEFAULT_SESSION_SIZE: SessionSize = { kind: 'pct', pct: 25 }

/** Resolve a size selection against the current pool total.
    undefined = no limit (practice everything). */
export function resolveSessionLimit(size: SessionSize, total: number): number | undefined {
  if (size.kind === 'manual') return parseSessionLimit(size.value, total)
  if (size.pct === 100 || total <= 0) return undefined
  return Math.max(1, Math.round((total * size.pct) / 100))
}
