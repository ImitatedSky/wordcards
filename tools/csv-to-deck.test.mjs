import { describe, it, expect } from 'vitest'
import { toCsv, parseCsv, splitList, COLUMNS } from './lib/csv.mjs'
import { readRecords, toDeckBundles, buildNotes, parseArgs } from './csv-to-deck.mjs'

const row = (over = {}) => ({
  book: 'C5',
  passage: "Johnson's Dictionary",
  headword: 'Circumscribe',
  pos: 'v.',
  meaning_zh: '限制、約束',
  definition_zh: '字根 circum- 環繞',
  synonyms: 'Restrict (v.) 限制 | Limit (v.) 限制',
  antonyms: '',
  pos_variations: 'Circumscription (n.) 限制',
  confusables: '',
  example_en: 'The power was circumscribed.',
  pronunciation: '',
  tags: '',
  ...over,
})

describe('csv master schema', () => {
  it('round-trips a row with list cells split and trimmed', () => {
    const csv = toCsv([row()])
    const records = readRecords(csv)
    expect(records).toHaveLength(1)
    expect(splitList(records[0].synonyms)).toEqual(['Restrict (v.) 限制', 'Limit (v.) 限制'])
  })

  it('writes a UTF-8 BOM as the first character', () => {
    expect(toCsv([]).charCodeAt(0)).toBe(0xfeff)
  })

  it('escapes commas and quotes per RFC-4180', () => {
    const csv = toCsv([row({ meaning_zh: '限制, "約束"' })])
    expect(readRecords(csv)[0].meaning_zh).toBe('限制, "約束"')
  })

  it('rejects a row with the wrong column count, naming the row', () => {
    const bad = COLUMNS.join(',') + '\r\nC5,only,three\r\n'
    expect(() => readRecords(bad)).toThrow(/row 2/)
  })

  it('rejects a header mismatch', () => {
    expect(() => readRecords('a,b,c\r\n')).toThrow(/header mismatch/)
  })

  it('accepts legacy headers, defaulting the columns they predate', () => {
    // v1 export: no etymology, no antonyms — what data/vocab.csv still is.
    const legacy = COLUMNS.filter((c) => c !== 'etymology' && c !== 'antonyms')
    const cells = legacy.map((c) => (c === 'headword' ? 'Circumscribe' : ''))
    const [record] = readRecords(`${legacy.join(',')}\r\n${cells.join(',')}\r\n`)
    expect(record.headword).toBe('Circumscribe')
    expect(record.etymology).toBe('')
    expect(record.antonyms).toBe('')
  })
})

describe('parseArgs', () => {
  it('defaults to the repo paths when given nothing', () => {
    expect(parseArgs([])).toEqual({ input: 'data/vocab.csv', outdir: 'data/decks' })
  })

  it('does not mistake the --outdir value for the input path', () => {
    expect(parseArgs(['--outdir', 'data/decks'])).toEqual({
      input: 'data/vocab.csv',
      outdir: 'data/decks',
    })
  })

  it('takes a positional input alongside --outdir in either order', () => {
    expect(parseArgs(['in.csv', '--outdir', 'out'])).toEqual({ input: 'in.csv', outdir: 'out' })
    expect(parseArgs(['--outdir', 'out', 'in.csv'])).toEqual({ input: 'in.csv', outdir: 'out' })
  })
})

describe('deck grouping and mapping', () => {
  it('groups rows into one deck per (book, passage)', () => {
    const bundles = toDeckBundles([
      row(),
      row({ headword: 'Settle' }),
      row({ passage: 'The birth of modern plastics', headword: 'Engineer' }),
    ])
    expect(bundles.map((b) => b.data.name)).toEqual([
      "C5 · Johnson's Dictionary",
      'C5 · The birth of modern plastics',
    ])
    expect(bundles[0].data.cards).toHaveLength(2)
    expect(bundles[1].data.cards).toHaveLength(1)
  })

  it('maps columns to card fields with fresh ids and zeroed stats', () => {
    const [bundle] = toDeckBundles([row()])
    expect(bundle.format).toBe('english-app-vocab-deck')
    expect(bundle.version).toBe(1)
    const card = bundle.data.cards[0]
    expect(card.front).toBe('Circumscribe (v.)')
    expect(card.back).toBe('限制、約束')
    expect(card.example).toBe('The power was circumscribed.')
    expect(card.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(card.stats).toEqual({ correctCount: 0, incorrectCount: 0, lastReviewedAt: null })
  })

  it('merges notes as titled sections in fixed order, one list item per line', () => {
    const notes = buildNotes(row({ confusables: 'President 總統 | Excess 過量' }))
    const idxDef = notes.indexOf('【精準字義】')
    const idxSyn = notes.indexOf('【同義詞】')
    const idxPos = notes.indexOf('【詞性變化】')
    const idxCon = notes.indexOf('【易混淆】')
    expect(idxDef).toBeGreaterThanOrEqual(0)
    expect(idxSyn).toBeGreaterThan(idxDef)
    expect(idxPos).toBeGreaterThan(idxSyn)
    expect(idxCon).toBeGreaterThan(idxPos)
    expect(notes).toContain('Restrict (v.) 限制\nLimit (v.) 限制')
  })

  it('omits empty sections from notes', () => {
    const notes = buildNotes(row({ synonyms: '', pos_variations: '', definition_zh: '' }))
    expect(notes).toBe('')
  })
})

describe('csv parser edge cases', () => {
  it('parses quoted cells containing newlines', () => {
    const rows = parseCsv('a,b\r\n"x\ny",z\r\n')
    expect(rows[1][0]).toBe('x\ny')
  })
})
