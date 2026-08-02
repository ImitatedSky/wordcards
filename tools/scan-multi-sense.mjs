#!/usr/bin/env node
/**
 * One-off audit helper: list every vocab entry whose Chinese meaning holds
 * multiple senses (fullwidth ; separator) plus formatting anomalies, so the
 * senses can be reviewed in bulk. Writes JSON to the path given as argv[2].
 */
import { readFileSync, writeFileSync } from 'node:fs'

const SEMI = '；' // ；
const COMMA = '，' // ，

const meanings = JSON.parse(readFileSync('data/vocab-source/meanings-final.json', 'utf8'))
const six = JSON.parse(readFileSync('data/vocab-source/tw6k.json', 'utf8'))
const sup = JSON.parse(readFileSync('data/vocab-source/supplement7000.json', 'utf8'))
const toeic = JSON.parse(readFileSync('data/vocab-source/toeic1000.json', 'utf8'))

const posByWord = new Map(six.map((e) => [e.Word.toLowerCase(), e.PartsOfSpeech.join('/')]))

function anomalies(zh) {
  const a = []
  for (const [open, close] of [['(', ')'], ['（', '）'], ['[', ']']]) {
    const o = zh.split(open).length - 1
    const c = zh.split(close).length - 1
    if (o !== c) a.push(`unbalanced ${open}${close}`)
  }
  if (/[;,]/.test(zh)) a.push('halfwidth ; or ,')
  if (new RegExp(`^[${SEMI}${COMMA}、]|[${SEMI}${COMMA}、]$`).test(zh)) a.push('leading/trailing separator')
  if (/[a-zA-Z]{2,}/.test(zh)) a.push('latin text')
  const senses = zh.split(SEMI).map((s) => s.trim())
  if (new Set(senses).size !== senses.length) a.push('duplicate sense')
  if (zh.trim() === '') a.push('empty')
  return a
}

const rows = []
for (const [word, zh] of Object.entries(meanings)) {
  const multi = zh.includes(SEMI)
  const probs = anomalies(zh)
  if (multi || probs.length) {
    rows.push({ src: 'meanings', word, pos: posByWord.get(word) ?? '', zh, probs })
  }
}
for (const e of sup) {
  const probs = anomalies(e.zh)
  if (e.zh.includes(SEMI) || probs.length) rows.push({ src: 'supplement', word: e.word, pos: e.pos, zh: e.zh, probs })
}
for (const e of toeic) {
  const probs = anomalies(e.zh)
  if (e.zh.includes(SEMI) || probs.length) rows.push({ src: 'toeic', word: e.word, pos: e.pos, zh: e.zh, probs })
}

const multiCount = rows.filter((r) => r.zh.includes(SEMI)).length
const withProbs = rows.filter((r) => r.probs.length)
console.log(`multi-sense entries: ${multiCount}`)
console.log(`formatting anomalies: ${withProbs.length}`)
writeFileSync(process.argv[2] ?? 'multi-sense.json', JSON.stringify(rows, null, 1), 'utf8')
console.log(`wrote ${rows.length} rows`)
