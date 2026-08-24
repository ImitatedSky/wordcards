import { describe, expect, it } from 'vitest'
import { matchChunkBounds } from './matchChunk'
import type { PracticeMode } from './usePracticeSession'

const m = (n: number) => Array<PracticeMode>(n).fill('match')

describe('matchChunkBounds', () => {
  it('a run within MAX is one chunk', () => {
    expect(matchChunkBounds(m(5), 0)).toEqual({ start: 0, end: 4 })
    expect(matchChunkBounds(m(5), 4)).toEqual({ start: 0, end: 4 })
    expect(matchChunkBounds(m(3), 1)).toEqual({ start: 0, end: 2 })
  })

  it('splits 12 into 4+4+4 (no lonely leftovers)', () => {
    expect(matchChunkBounds(m(12), 0)).toEqual({ start: 0, end: 3 })
    expect(matchChunkBounds(m(12), 4)).toEqual({ start: 4, end: 7 })
    expect(matchChunkBounds(m(12), 11)).toEqual({ start: 8, end: 11 })
  })

  it('splits 7 into 4+3', () => {
    expect(matchChunkBounds(m(7), 3)).toEqual({ start: 0, end: 3 })
    expect(matchChunkBounds(m(7), 4)).toEqual({ start: 4, end: 6 })
  })

  it('splits 6 into 3+3', () => {
    expect(matchChunkBounds(m(6), 2)).toEqual({ start: 0, end: 2 })
    expect(matchChunkBounds(m(6), 3)).toEqual({ start: 3, end: 5 })
  })

  it('respects run boundaries among other modes', () => {
    const modes: PracticeMode[] = ['flip', 'match', 'match', 'match', 'multiple_choice']
    expect(matchChunkBounds(modes, 2)).toEqual({ start: 1, end: 3 })
  })
})
