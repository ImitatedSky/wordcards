/** Minimal RFC-4180 CSV reader/writer (UTF-8 with BOM on write). */

export const COLUMNS = [
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
]

export const LIST_SEPARATOR = ' | '

function escapeCell(value) {
  const s = String(value ?? '')
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(rows) {
  const lines = [COLUMNS.join(',')]
  for (const row of rows) {
    lines.push(COLUMNS.map((c) => escapeCell(row[c])).join(','))
  }
  return '﻿' + lines.join('\r\n') + '\r\n'
}

/** Parse CSV text into arrays of raw cell strings (header row included). */
export function parseCsv(text) {
  const src = text.replace(/^﻿/, '')
  const rows = []
  let row = []
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
  // drop trailing fully-empty rows
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

export function splitList(cell) {
  return String(cell ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
}
