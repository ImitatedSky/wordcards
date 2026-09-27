/**
 * Build the self-hosted fonts served as static assets from public/fonts/:
 *   public/fonts/fonts.css       @font-face rules (woff2 only), loaded by index.html
 *   public/fonts/files/*.woff2   the subset files those rules point at
 *
 * These live in public/ instead of going through Vite because public/ paths
 * are stable. The Android shell leaves fonts/files/ out of the APK and fetches
 * each file on demand from the deployed site (android/app/src/main/res/raw/
 * remote_assets.json), which only works if the path is known ahead of time.
 *
 * Each file name carries a hash of its content. The app caches downloaded
 * files forever, so a path must never change meaning: if a fontsource update
 * reshuffles its subsets, the name changes too, and an older app either gets
 * the exact file it expects or a 404 (and falls back to the system font).
 *
 * To add a font: npm install @fontsource/<name>, then add a line to FONTS.
 *
 * Usage: node tools/build-fonts.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'

const FONTS = [
  { family: 'noto-sans-tc', weights: [400, 500, 700] },
]

const ROOT = resolve(import.meta.dirname, '..')
const OUT_DIR = join(ROOT, 'public/fonts')
const FILES_DIR = join(OUT_DIR, 'files')

// fontsource writes every src as: url(./files/X.woff2) format('woff2'), url(./files/X.woff) format('woff')
const SRC_PATTERN = /url\(\.\/files\/([^)]+)\.woff2\) format\('woff2'\), url\(\.\/files\/\1\.woff\) format\('woff'\)/g

function buildFontCss(family, weight, packageDir) {
  const css = readFileSync(join(packageDir, `${weight}.css`), 'utf8')
  let replaced = 0
  const out = css.replace(SRC_PATTERN, (_, name) => {
    replaced++
    const data = readFileSync(join(packageDir, 'files', `${name}.woff2`))
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 10)
    const fileName = `${name}.${hash}.woff2`
    writeFileSync(join(FILES_DIR, fileName), data)
    return `url(./files/${fileName}) format('woff2')`
  })
  // If fontsource ever changes its format, fail loudly instead of shipping rules
  // that still point at files we never copied
  const faces = css.match(/@font-face/g)?.length ?? 0
  if (faces === 0 || replaced !== faces) {
    throw new Error(`${family}/${weight}.css: rewrote ${replaced} of ${faces} @font-face src entries`)
  }
  return out
}

function main() {
  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(FILES_DIR, { recursive: true })

  const parts = []
  for (const { family, weights } of FONTS) {
    const packageDir = join(ROOT, 'node_modules/@fontsource', family)
    for (const weight of weights) {
      parts.push(buildFontCss(family, weight, packageDir))
    }
  }
  writeFileSync(join(OUT_DIR, 'fonts.css'), parts.join('\n'))
  console.log(`Wrote public/fonts/fonts.css (${FONTS.map((f) => f.family).join(', ')})`)
}

main()
