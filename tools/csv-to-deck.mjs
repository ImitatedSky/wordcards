/**
 * Repeatable conversion: data/vocab.csv → data/decks/*.json
 * (english-app-vocab-deck bundles, one per (book, passage) pair)
 *
 * Usage: node tools/csv-to-deck.mjs [data/vocab.csv] [--outdir data/decks]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { parseCsv, splitList, COLUMNS } from './lib/csv.mjs'

const NOTE_SECTIONS = [
  ['definition_zh', '【精準字義】', 'text'],
  ['etymology', '【字根字首】', 'text'],
  ['synonyms', '【同義詞】', 'list'],
  ['antonyms', '【反義詞】', 'list'],
  ['pos_variations', '【詞性變化】', 'list'],
  ['confusables', '【易混淆】', 'list'],
]

/** Merge the rich note columns into one titled plain-text notes field. */
export function buildNotes(record) {
  const parts = []
  for (const [col, title, kind] of NOTE_SECTIONS) {
    const value = record[col]
    if (!value) continue
    const body = kind === 'list' ? splitList(value).join('\n') : value
    if (body) parts.push(`${title}\n${body}`)
  }
  return parts.join('\n\n')
}

/** Parse raw CSV text into validated records. Throws on malformed rows. */
export function readRecords(csvText) {
  const rows = parseCsv(csvText)
  if (rows.length === 0) throw new Error('CSV is empty')
  const header = rows[0]
  if (header.join(',') !== COLUMNS.join(',')) {
    throw new Error(`header mismatch: expected "${COLUMNS.join(',')}" got "${header.join(',')}"`)
  }
  return rows.slice(1).map((cells, idx) => {
    if (cells.length !== COLUMNS.length) {
      throw new Error(`row ${idx + 2}: expected ${COLUMNS.length} columns, got ${cells.length}`)
    }
    const record = {}
    COLUMNS.forEach((c, i) => (record[c] = cells[i].trim()))
    return record
  })
}

/** Group records into english-app-vocab-deck bundles (one per book+passage). */
export function toDeckBundles(records, now = Date.now()) {
  const groups = new Map()
  for (const r of records) {
    const key = `${r.book} · ${r.passage}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }
  return [...groups.entries()].map(([name, rows]) => ({
    format: 'english-app-vocab-deck',
    version: 1,
    data: {
      id: randomUUID(),
      name,
      description: `由 vocab.csv 匯入（${rows[0].book} / ${rows[0].passage}）`,
      language: { front: 'en', back: 'zh' },
      cards: rows.map((r) => ({
        id: randomUUID(),
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
    },
    tags: [],
  }))
}

function slugify(name) {
  return name
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

// CLI entry — skipped when imported by tests.
if (process.argv[1] && resolve(process.argv[1]).endsWith('csv-to-deck.mjs')) {
  const args = process.argv.slice(2)
  const input = args.find((a) => !a.startsWith('--')) ?? 'data/vocab.csv'
  const outdir = args.includes('--outdir') ? args[args.indexOf('--outdir') + 1] : 'data/decks'

  try {
    const records = readRecords(readFileSync(resolve(input), 'utf8'))
    const bundles = toDeckBundles(records)
    mkdirSync(resolve(outdir), { recursive: true })
    for (const bundle of bundles) {
      const file = join(resolve(outdir), `${slugify(bundle.data.name)}.json`)
      writeFileSync(file, JSON.stringify(bundle, null, 2), 'utf8')
      console.log(`✔ ${bundle.data.name}: ${bundle.data.cards.length} cards → ${file}`)
    }
  } catch (err) {
    console.error(`✖ ${err.message}`)
    process.exit(1)
  }
}
