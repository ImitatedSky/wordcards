import type { PracticeMode } from './usePracticeSession'

/** A matching screen shows at most this many pairs. */
export const MATCH_CHUNK_MAX = 5

/**
 * Bounds (inclusive) of the match chunk containing `index`.
 *
 * A maximal run of consecutive 'match' positions is divided into
 * ceil(len / MAX) chunks of near-equal size (e.g. 12 → 4+4+4, 7 → 4+3),
 * so no screen ends up with a lonely leftover pair.
 */
export function matchChunkBounds(
  queueModes: PracticeMode[],
  index: number,
): { start: number; end: number } {
  let runStart = index
  while (runStart > 0 && queueModes[runStart - 1] === 'match') runStart--
  let runEnd = index
  while (runEnd + 1 < queueModes.length && queueModes[runEnd + 1] === 'match') runEnd++

  const runLen = runEnd - runStart + 1
  const chunkCount = Math.ceil(runLen / MATCH_CHUNK_MAX)
  const base = Math.floor(runLen / chunkCount)
  const extra = runLen % chunkCount // first `extra` chunks get one more

  let offset = 0
  for (let i = 0; i < chunkCount; i++) {
    const size = base + (i < extra ? 1 : 0)
    if (index < runStart + offset + size) {
      return { start: runStart + offset, end: runStart + offset + size - 1 }
    }
    offset += size
  }
  return { start: runStart, end: runEnd } // unreachable
}
