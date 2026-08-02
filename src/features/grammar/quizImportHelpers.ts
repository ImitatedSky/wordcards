import type { GrammarQuizExport } from '@/types/import-export'

type ValidationResult =
  | { ok: true; bundle: GrammarQuizExport }
  | { ok: false; reason: string }

/** Validate a parsed JSON payload as an english-app-grammar-quiz bundle. */
export function validateQuizBundle(json: unknown): ValidationResult {
  if (typeof json !== 'object' || json === null) {
    return { ok: false, reason: '檔案內容不是有效的 JSON 物件。' }
  }
  const obj = json as Record<string, unknown>
  if (obj.format !== 'english-app-grammar-quiz') {
    return { ok: false, reason: '不支援的檔案格式：這不是 english-app 的文法測驗匯出檔。' }
  }
  if (obj.version !== 1) {
    return { ok: false, reason: `不支援的版本（${String(obj.version)}）：目前僅支援 version 1。` }
  }
  const data = obj.data as Record<string, unknown> | undefined
  if (!data || typeof data.name !== 'string' || !data.name.trim() || !Array.isArray(data.questions)) {
    return { ok: false, reason: '測驗資料不完整：缺少名稱或題目清單。' }
  }
  return { ok: true, bundle: obj as unknown as GrammarQuizExport }
}
