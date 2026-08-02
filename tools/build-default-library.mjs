#!/usr/bin/env node
/**
 * Build the built-in default vocabulary library served as static assets:
 * data/vocab-source → public/default-library/{manifest.json, <deck>.json}
 *
 * Decks: LV1..LV6 (高中7000, 108 curriculum), 補充字 (old-7000 leftovers),
 *        多益常用1000. One english-app-vocab-deck bundle per deck.
 *
 * Output is deterministic: card ids derive from deck id + headword,
 * createdAt/updatedAt are 0 (the app stamps real times at seed time), and
 * the manifest version is a content hash — so re-running with unchanged
 * sources produces byte-identical files, and any word change bumps the
 * version seen by deployed clients.
 *
 * Usage: node tools/build-default-library.mjs [--outdir public/default-library]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { buildNotes } from './csv-to-deck.mjs'

export const MANIFEST_FORMAT = 'english-app-default-library'

function toCard(deckId, word, pos, meaning, extra = {}) {
  const notes = buildNotes({
    definition_zh: '',
    etymology: extra.etym ?? '',
    synonyms: extra.syn ?? '',
    antonyms: extra.ant ?? '',
    pos_variations: '',
    confusables: '',
  })
  return {
    id: `${deckId}:${word.toLowerCase()}`,
    front: pos ? `${word} (${pos})` : word,
    back: meaning,
    example: extra.ex || undefined,
    notes: notes || undefined,
    tags: [],
    stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
  }
}

function assertUniqueHeadwords(deckName, words) {
  const seen = new Set()
  const dups = new Set()
  for (const w of words) {
    const key = w.toLowerCase()
    if (seen.has(key)) dups.add(key)
    seen.add(key)
  }
  if (dups.size > 0) {
    throw new Error(`${deckName}: duplicate headwords: ${[...dups].sort().join(', ')}`)
  }
}

/**
 * Assemble all default decks from parsed sources.
 * sources: { six, meanings, enrich, supplement, toeic }
 * Returns [{ id, file, name, description, cards }] in fixed order.
 */
export function buildDecks({ six, meanings, enrich = {}, supplement = [], toeic = [] }) {
  const decks = []

  for (let level = 1; level <= 6; level++) {
    const entries = six
      .filter((e) => e.Level === String(level))
      .sort((a, b) => a.Word.localeCompare(b.Word, 'en'))
    if (entries.length === 0) continue
    const id = `default-lv${level}`
    assertUniqueHeadwords(id, entries.map((e) => e.Word))
    decks.push({
      id,
      file: `lv${level}.json`,
      name: `高中7000 LV${level}`,
      description: `內建字庫：高中 7000 單字 第 ${level} 級（108 課綱參考詞彙）`,
      cards: entries.map((e) => {
        const meaning = meanings[e.Word.toLowerCase()]
        if (!meaning) throw new Error(`missing meaning for ${e.Word}`)
        return toCard(id, e.Word, e.PartsOfSpeech.join('/'), meaning, enrich[e.Word.toLowerCase()])
      }),
    })
  }

  if (supplement.length > 0) {
    const entries = [...supplement].sort((a, b) => a.word.localeCompare(b.word, 'en'))
    const id = 'default-supplement-7000'
    assertUniqueHeadwords(id, entries.map((e) => e.word))
    decks.push({
      id,
      file: 'supplement-7000.json',
      name: '高中7000 補充字',
      description: '內建字庫：舊 7000 詞彙中未列入 108 課綱的補充字',
      cards: entries.map((e) => toCard(id, e.word, e.pos, e.zh, enrich[e.word.toLowerCase()])),
    })
  }

  if (toeic.length > 0) {
    const entries = [...toeic].sort((a, b) => a.word.localeCompare(b.word, 'en'))
    const id = 'default-toeic-1000'
    assertUniqueHeadwords(id, entries.map((e) => e.word))
    decks.push({
      id,
      file: 'toeic-1000.json',
      name: '多益常用1000',
      description: '內建字庫：多益常用 1000 字',
      cards: entries.map((e) => toCard(id, e.word, e.pos, e.zh, enrich[e.word.toLowerCase()])),
    })
  }

  return decks
}

/** Wrap one assembled deck as an importable english-app-vocab-deck bundle. */
export function bundleDeck(deck) {
  return {
    format: 'english-app-vocab-deck',
    version: 1,
    data: {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      language: { front: 'en', back: 'zh' },
      cards: deck.cards,
      tags: [],
      createdAt: 0,
      updatedAt: 0,
    },
    tags: [],
  }
}

/** Build manifest + files from sources. Returns { manifest, files: [{file, json}] }. */
export function buildLibrary(sources) {
  const decks = buildDecks(sources)
  const files = decks.map((d) => ({ file: d.file, json: JSON.stringify(bundleDeck(d), null, 2) }))
  const version = createHash('sha256')
    .update(files.map((f) => f.json).join('\n'))
    .digest('hex')
    .slice(0, 16)
  const manifest = {
    format: MANIFEST_FORMAT,
    version,
    decks: decks.map((d) => ({ id: d.id, file: d.file, name: d.name, cardCount: d.cards.length })),
  }
  return { manifest, files }
}

// CLI entry — skipped when imported by tests.
if (process.argv[1] && resolve(process.argv[1]).endsWith('build-default-library.mjs')) {
  const args = process.argv.slice(2)
  const outdir = args.includes('--outdir')
    ? args[args.indexOf('--outdir') + 1]
    : 'public/default-library'
  const SRC = 'data/vocab-source'
  const read = (f) => JSON.parse(readFileSync(resolve(SRC, f), 'utf8'))

  try {
    const { manifest, files } = buildLibrary({
      six: read('tw6k.json'),
      meanings: read('meanings-final.json'),
      enrich: read('enrich.json'),
      supplement: read('supplement7000.json'),
      toeic: read('toeic1000.json'),
    })
    mkdirSync(resolve(outdir), { recursive: true })
    for (const { file, json } of files) {
      writeFileSync(join(resolve(outdir), file), json, 'utf8')
    }
    writeFileSync(join(resolve(outdir), 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    for (const d of manifest.decks) console.log(`✔ ${d.name}: ${d.cardCount} cards → ${d.file}`)
    console.log(`✔ manifest version ${manifest.version} → ${outdir}/manifest.json`)
  } catch (err) {
    console.error(`✖ ${err.message}`)
    process.exit(1)
  }
}
