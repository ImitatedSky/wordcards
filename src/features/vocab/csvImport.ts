import type { Deck } from '@/types/deck'
import { newId } from '@/utils/uuid'

/**
 * Browser-side CSV → Deck conversion for the fixed 12-column master schema.
 *
 * Deliberately mirrors tools/lib/csv.mjs + tools/csv-to-deck.mjs (Node CLI):
 * the two run in different runtimes, and sharing one source would cost more
 * in cross-runtime packaging than this ~100-line duplication. Both sides are
 * pinned by tests asserting the same header, grouping, and notes behavior.
 */

export const CSV_COLUMNS = [
  'book',
  'passage',
  'headword',
  'pos',
  'meaning_zh',
  'definition_zh',
  'etymology',
  'synonyms',
  'antonyms',
  'pos_variations',
  'confusables',
  'example_en',
  'pronunciation',
  'tags',
] as const

/** Older files are still accepted: v2 predates etymology, v1 also antonyms. */
const LEGACY_HEADER_VARIANTS = [
  CSV_COLUMNS.filter((c) => c !== 'etymology'),
  CSV_COLUMNS.filter((c) => c !== 'etymology' && c !== 'antonyms'),
]

type Column = (typeof CSV_COLUMNS)[number]
type CsvRecord = Record<Column, string>

const NOTE_SECTIONS: Array<[Column, string, 'text' | 'list']> = [
  ['definition_zh', '【精準字義】', 'text'],
  ['etymology', '【字根字首】', 'text'],
  ['synonyms', '【同義詞】', 'list'],
  ['antonyms', '【反義詞】', 'list'],
  ['pos_variations', '【詞性變化】', 'list'],
  ['confusables', '【易混淆】', 'list'],
]

/** Minimal RFC-4180 parser (handles quotes, escaped quotes, CRLF, BOM). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

function splitList(cell: string): string[] {
  return cell
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildNotes(record: CsvRecord): string {
  const parts: string[] = []
  for (const [col, title, kind] of NOTE_SECTIONS) {
    const value = record[col]
    if (!value) continue
    const body = kind === 'list' ? splitList(value).join('\n') : value
    if (body) parts.push(`${title}\n${body}`)
  }
  return parts.join('\n\n')
}

export type CsvImportResult =
  | { ok: true; decks: Deck[] }
  | { ok: false; reason: string }

/** Convert raw cell rows (header row included) into decks. `where` prefixes
    error messages so multi-sheet workbooks can name the offending sheet. */
export function rowsToDecks(rows: string[][], where = '', now = Date.now()): CsvImportResult {
  const at = where ? `${where}：` : ''
  if (rows.length === 0) return { ok: false, reason: `${at}內容是空的。` }

  const header = rows[0].map((h) => h.trim())
  const activeColumns = [CSV_COLUMNS, ...LEGACY_HEADER_VARIANTS].find(
    (cols) => header.join(',') === cols.join(','),
  )
  if (!activeColumns) {
    return {
      ok: false,
      reason: `${at}表頭不符固定規格。應為：${CSV_COLUMNS.join(',')}`,
    }
  }
  if (rows.length === 1) return { ok: false, reason: `${at}沒有任何資料列。` }

  const records: CsvRecord[] = []
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]
    if (cells.length !== activeColumns.length) {
      return {
        ok: false,
        reason: `${at}第 ${i + 1} 列欄位數錯誤：應為 ${activeColumns.length} 欄，實際 ${cells.length} 欄。`,
      }
    }
    const record = { antonyms: '', etymology: '' } as CsvRecord
    activeColumns.forEach((c, idx) => (record[c] = cells[idx].trim()))
    if (!record.headword || !record.meaning_zh) {
      return { ok: false, reason: `${at}第 ${i + 1} 列缺少 headword 或 meaning_zh。` }
    }
    records.push(record)
  }

  const groups = new Map<string, CsvRecord[]>()
  for (const r of records) {
    const name = [r.book, r.passage].filter(Boolean).join(' · ') || '匯入單字'
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name)!.push(r)
  }

  const decks: Deck[] = [...groups.entries()].map(([name, groupRows]) => ({
    id: newId(),
    name,
    description: `由 CSV 匯入`,
    language: { front: 'en', back: 'zh' },
    cards: groupRows.map((r) => ({
      id: newId(),
      front: r.pos ? `${r.headword} (${r.pos})` : r.headword,
      back: r.meaning_zh,
      example: r.example_en || undefined,
      pronunciation: r.pronunciation || undefined,
      notes: buildNotes(r) || undefined,
      tags: [],
      stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
    })),
    tags: [],
    createdAt: now,
    updatedAt: now,
  }))

  return { ok: true, decks }
}

/** Convert master-schema CSV text into decks (one per book+passage pair). */
export function csvToDecks(text: string, now = Date.now()): CsvImportResult {
  const rows = parseCsv(text)
  if (rows.length === 0) return { ok: false, reason: 'CSV 檔案是空的。' }
  return rowsToDecks(rows, '', now)
}

/** Split one markdown table row on unescaped pipes; `\|` unescapes to `|`
    (which is how the in-cell list separator survives inside a table). */
function splitMarkdownRow(line: string): string[] {
  const inner = line.replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let current = ''
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '\\' && inner[i + 1] === '|') {
      current += '|'
      i++
    } else if (ch === '|') {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

/** Extract all markdown tables (lines starting with `|`) as cell grids.
    Alignment separator rows (`---`, `:---:`) are skipped. */
export function parseMarkdownTables(text: string): string[][][] {
  const tables: string[][][] = []
  let current: string[][] | null = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('|') && line.length > 1) {
      const cells = splitMarkdownRow(line)
      if (cells.every((c) => /^:?-+:?$/.test(c))) continue
      if (!current) {
        current = []
        tables.push(current)
      }
      current.push(cells)
    } else {
      current = null
    }
  }
  return tables
}

/** Convert a markdown document's tables into decks — each table validated
    independently (like workbook sheets), results merged. */
export function markdownToDecks(text: string, now = Date.now()): CsvImportResult {
  const tables = parseMarkdownTables(text)
  if (tables.length === 0) {
    return { ok: false, reason: 'Markdown 檔裡找不到表格（每列需以 | 開頭）。' }
  }
  const decks: Deck[] = []
  for (const [i, rows] of tables.entries()) {
    const result = rowsToDecks(rows, tables.length > 1 ? `表格 ${i + 1}` : '', now)
    if (!result.ok) return result
    decks.push(...result.decks)
  }
  return { ok: true, decks }
}

/** Convert an .xlsx workbook's sheets into decks — one sheet at a time, all
    merged. Every sheet must use the same 12-column master schema. */
export function sheetsToDecks(
  sheets: Array<{ name: string; rows: string[][] }>,
  now = Date.now(),
): CsvImportResult {
  if (sheets.length === 0) return { ok: false, reason: 'Excel 檔裡沒有任何分頁。' }
  const decks: Deck[] = []
  for (const sheet of sheets) {
    const result = rowsToDecks(sheet.rows, `分頁「${sheet.name}」`, now)
    if (!result.ok) return result
    decks.push(...result.decks)
  }
  return { ok: true, decks }
}
