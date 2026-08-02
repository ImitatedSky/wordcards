import type { VocabDeckExport } from '@/types/import-export'

type ValidationResult =
  | { ok: true; bundle: VocabDeckExport }
  | { ok: false; reason: string }

/** Validate a parsed JSON payload as an english-app-vocab-deck bundle. */
export function validateDeckBundle(json: unknown): ValidationResult {
  if (typeof json !== 'object' || json === null) {
    return { ok: false, reason: '檔案內容不是有效的 JSON 物件。' }
  }
  const obj = json as Record<string, unknown>
  if (obj.format !== 'english-app-vocab-deck') {
    return { ok: false, reason: '不支援的檔案格式：這不是 english-app 的單字牌組匯出檔。' }
  }
  if (obj.version !== 1) {
    return { ok: false, reason: `不支援的版本（${String(obj.version)}）：目前僅支援 version 1。` }
  }
  const data = obj.data as Record<string, unknown> | undefined
  if (!data || typeof data.name !== 'string' || !data.name.trim() || !Array.isArray(data.cards)) {
    return { ok: false, reason: '牌組資料不完整：缺少名稱或卡片清單。' }
  }
  return { ok: true, bundle: obj as unknown as VocabDeckExport }
}

/** Pick a name that doesn't collide: "name (2)", "name (3)", … */
export function nextAvailableName(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base} (${n})`)) n++
  return `${base} (${n})`
}
