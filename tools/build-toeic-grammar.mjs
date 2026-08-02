#!/usr/bin/env node
/**
 * Build the TOEIC grammar quiz bundle (english-app-grammar-quiz, version 1)
 * from the hand-curated question source.
 *
 * Usage: node tools/build-toeic-grammar.mjs [--out data/quizzes/多益文法.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

const args = process.argv.slice(2)
const out = args.includes('--out')
  ? args[args.indexOf('--out') + 1]
  : 'data/quizzes/多益文法50題.json'

const source = JSON.parse(readFileSync(resolve('data/vocab-source/toeic-grammar.json'), 'utf8'))

for (const [i, q] of source.entries()) {
  if (!q.prompt || !Array.isArray(q.options) || q.options.length < 2) {
    throw new Error(`question ${i + 1}: malformed`)
  }
  if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
    throw new Error(`question ${i + 1}: correctIndex out of range`)
  }
}

const now = Date.now()
const bundle = {
  format: 'english-app-grammar-quiz',
  version: 1,
  data: {
    id: randomUUID(),
    name: '多益文法 Part 5 精選',
    description: 'TOEIC Part 5 風格文法題：時態、詞性、介係詞、連接詞、關係代名詞、假設語氣等',
    language: 'en',
    questions: source.map((q) => ({
      id: randomUUID(),
      type: 'multiple_choice',
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      tags: [],
      stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
    })),
    tags: [],
    createdAt: now,
    updatedAt: now,
  },
  tags: [],
}

mkdirSync(dirname(resolve(out)), { recursive: true })
writeFileSync(resolve(out), JSON.stringify(bundle, null, 2), 'utf8')
console.log(`✔ ${bundle.data.questions.length} questions → ${out}`)
