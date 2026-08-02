#!/usr/bin/env node
/**
 * Build the leveled vocabulary workbook: one .xlsx, one sheet per deck.
 *
 * Sheets: LV1..LV6 (Taiwan 108-curriculum reference list, A→Z within level)
 *         + TOEIC1000 (common TOEIC words) when the source file exists.
 * Every sheet uses the app's 12-column master schema so the workbook can be
 * imported directly (one sheet → one deck).
 *
 * Usage: node tools/build-vocab-xlsx.mjs [--out data/vocab-levels.xlsx]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { COLUMNS } from './lib/csv.mjs'

const args = process.argv.slice(2)
const out = args.includes('--out')
  ? args[args.indexOf('--out') + 1]
  : 'data/高中6000單字LV1-LV6.xlsx'
const toeicOut = args.includes('--toeic-out')
  ? args[args.indexOf('--toeic-out') + 1]
  : 'data/多益常用1000單.xlsx'

const SRC = 'data/vocab-source'
const six = JSON.parse(readFileSync(resolve(SRC, 'tw6k.json'), 'utf8'))
const meanings = JSON.parse(readFileSync(resolve(SRC, 'meanings-final.json'), 'utf8'))

// Optional per-word enrichment (synonyms/antonyms/example), merged when
// data/vocab-source/enrich.json exists: { [word]: { syn, ant, ex } }
const enrichPath = resolve(SRC, 'enrich.json')
const enrich = existsSync(enrichPath) ? JSON.parse(readFileSync(enrichPath, 'utf8')) : {}

function toRow(book, word, pos, meaning) {
  const extra = enrich[word.toLowerCase()] ?? {}
  return {
    book,
    passage: '',
    headword: word,
    pos,
    meaning_zh: meaning,
    definition_zh: '',
    etymology: extra.etym ?? '',
    synonyms: extra.syn ?? '',
    antonyms: extra.ant ?? '',
    pos_variations: '',
    confusables: '',
    example_en: extra.ex ?? '',
    pronunciation: '',
    tags: '',
  }
}

const workbook = XLSX.utils.book_new()
let total = 0

for (let level = 1; level <= 6; level++) {
  const rows = six
    .filter((e) => e.Level === String(level))
    .sort((a, b) => a.Word.localeCompare(b.Word, 'en'))
    .map((e) => {
      const meaning = meanings[e.Word.toLowerCase()]
      if (!meaning) throw new Error(`missing meaning for ${e.Word}`)
      return toRow(`LV${level}`, e.Word, e.PartsOfSpeech.join('/'), meaning)
    })
  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...COLUMNS] })
  XLSX.utils.book_append_sheet(workbook, sheet, `LV${level}`)
  console.log(`LV${level}: ${rows.length} words`)
  total += rows.length
}

// Words from the older 7000-word list that the 108 edition dropped — no
// official level, so they get their own 補充 sheet (7th tab).
const supplementPath = resolve(SRC, 'supplement7000.json')
if (existsSync(supplementPath)) {
  const supplement = JSON.parse(readFileSync(supplementPath, 'utf8'))
  const rows = supplement
    .sort((a, b) => a.word.localeCompare(b.word, 'en'))
    .map((e) => toRow('補充字', e.word, e.pos, e.zh))
  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...COLUMNS] })
  XLSX.utils.book_append_sheet(workbook, sheet, '補充字-舊7000')
  console.log(`補充字-舊7000: ${rows.length} words`)
  total += rows.length
}

mkdirSync(dirname(resolve(out)), { recursive: true })
XLSX.writeFile(workbook, resolve(out))
console.log(`✔ ${total} words → ${out}`)

// TOEIC goes into its own workbook (separate file by request).
const toeicPath = resolve(SRC, 'toeic1000.json')
if (existsSync(toeicPath)) {
  const toeic = JSON.parse(readFileSync(toeicPath, 'utf8'))
  const rows = toeic
    .sort((a, b) => a.word.localeCompare(b.word, 'en'))
    .map((e) => toRow('多益常用1000', e.word, e.pos, e.zh))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { header: [...COLUMNS] }), 'TOEIC')
  XLSX.writeFile(wb, resolve(toeicOut))
  console.log(`✔ TOEIC ${rows.length} words → ${toeicOut}`)
} else {
  console.log('(toeic1000.json not found — skipping TOEIC workbook)')
}
