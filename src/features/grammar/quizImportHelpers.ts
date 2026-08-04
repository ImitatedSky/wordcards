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

/** A minimal valid english-app-grammar-quiz bundle, offered when import fails. */
export function quizJsonTemplate(): string {
  const now = Date.now()
  const bundle = {
    format: 'english-app-grammar-quiz',
    version: 1,
    exportedAt: now,
    data: {
      id: 'template-quiz',
      name: '範例測驗',
      description: '把 questions 換成你的題目後匯入。',
      language: 'en',
      questions: [
        {
          id: 'template-q1',
          type: 'multiple_choice',
          prompt: 'She ___ to school every day.',
          options: ['go', 'goes', 'going', 'gone'],
          correctIndex: 1,
          explanation: '第三人稱單數現在式動詞加 -es。',
          tags: [],
          stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
        },
        {
          id: 'template-q2',
          type: 'fill_in_blank',
          prompt: 'I have lived here ___ 2020.',
          answers: ['since'],
          caseSensitive: false,
          explanation: '完成式搭配起始時間點用 since。',
          tags: [],
          stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
        },
      ],
      tags: [],
      createdAt: now,
      updatedAt: now,
    },
  }
  return JSON.stringify(bundle, null, 2)
}
