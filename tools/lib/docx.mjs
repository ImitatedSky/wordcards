import { readFileSync } from 'node:fs'
import { unzipSync, strFromU8 } from 'fflate'

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decodeEntities(s) {
  return s
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ENTITIES[name])
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
}

/**
 * Extract paragraph text lines from a .docx file.
 * Splits document.xml on </w:p> and joins all <w:t> runs per paragraph.
 */
export function extractParagraphs(docxPath) {
  const zip = unzipSync(readFileSync(docxPath))
  const doc = zip['word/document.xml']
  if (!doc) throw new Error(`word/document.xml not found in ${docxPath}`)
  const xml = strFromU8(doc)
  return xml.split('</w:p>').map((para) => {
    const texts = [...para.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/gs)].map((m) => m[1])
    return decodeEntities(texts.join(''))
      .replace(/[​﻿]/g, '') // zero-width chars
      .replace(/　/g, ' ') // full-width space
      .trim()
  })
}
