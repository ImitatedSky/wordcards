#!/usr/bin/env node
/**
 * One-time extraction: 雅思 Reading.docx → data/vocab.csv
 *
 * Usage: node tools/docx-extract.mjs <input.docx> [--out data/vocab.csv] [--expect 131]
 * Exits non-zero (writing nothing) when validation fails, listing offending lines.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { extractParagraphs } from './lib/docx.mjs'
import { parseEntries, validateEntries } from './lib/entries.mjs'
import { toCsv, LIST_SEPARATOR } from './lib/csv.mjs'

const args = process.argv.slice(2)
const input = args.find((a) => !a.startsWith('--'))
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'data/vocab.csv'
const expect = args.includes('--expect') ? Number(args[args.indexOf('--expect') + 1]) : 131

if (!input) {
  console.error('Usage: node tools/docx-extract.mjs <input.docx> [--out file] [--expect N]')
  process.exit(1)
}

const lines = extractParagraphs(resolve(input))
const { entries, unclassified } = parseEntries(lines)
const problems = validateEntries(entries, expect)

if (unclassified.length > 0) {
  console.warn(`⚠ ${unclassified.length} unclassified line(s) outside any entry:`)
  for (const u of unclassified) console.warn(`   line ${u.lineNo}: ${u.line.slice(0, 60)}`)
}

if (problems.length > 0) {
  console.error(`✖ validation failed (${problems.length} problem(s)):`)
  for (const p of problems) console.error(`   ${p}`)
  process.exit(1)
}

const rows = entries.map((e) => ({
  book: e.book,
  passage: e.passage,
  headword: e.headword,
  pos: e.pos,
  meaning_zh: e.meaning_zh,
  definition_zh: e.definition,
  etymology: '',
  synonyms: e.synonyms.join(LIST_SEPARATOR),
  antonyms: '',
  pos_variations: e.pos_variations.join(LIST_SEPARATOR),
  confusables: e.confusables.join(LIST_SEPARATOR),
  example_en: e.example,
  pronunciation: '',
  tags: '',
}))

mkdirSync(dirname(resolve(out)), { recursive: true })
writeFileSync(resolve(out), toCsv(rows), 'utf8')

const byDeck = new Map()
for (const r of rows) {
  const k = `${r.book} · ${r.passage}`
  byDeck.set(k, (byDeck.get(k) ?? 0) + 1)
}
console.log(`✔ ${rows.length} entries → ${out}`)
for (const [deck, n] of byDeck) console.log(`   ${deck}: ${n}`)
