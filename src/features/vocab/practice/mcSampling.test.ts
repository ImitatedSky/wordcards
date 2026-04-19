import { describe, it, expect } from 'vitest'
import { sampleDistractors, MC_FALLBACKS } from './mcSampling'

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

describe('sampleDistractors', () => {
  it('returns 4 options with the correct answer included', () => {
    const result = sampleDistractors('A', ['B', 'C', 'D', 'E'], seededRandom(1))
    expect(result.options).toHaveLength(4)
    expect(result.options).toContain('A')
    expect(result.options[result.correctIndex]).toBe('A')
  })

  it('dedupes distractors and excludes the correct answer', () => {
    const result = sampleDistractors('A', ['A', 'A', 'B', 'B', 'C'], seededRandom(2))
    const withoutCorrect = result.options.filter((_, i) => i !== result.correctIndex)
    expect(new Set(withoutCorrect).size).toBe(withoutCorrect.length)
    expect(withoutCorrect).not.toContain('A')
  })

  it('pads from fallbacks when fewer than 3 unique distractors exist', () => {
    const result = sampleDistractors('only', ['only'], seededRandom(3))
    expect(result.options).toHaveLength(4)
    const distractors = result.options.filter((_, i) => i !== result.correctIndex)
    expect(distractors.every((d) => MC_FALLBACKS.includes(d))).toBe(true)
  })

  it('works when there are exactly 3 unique distractors', () => {
    const result = sampleDistractors('A', ['B', 'C', 'D'], seededRandom(4))
    expect(result.options.sort()).toEqual(['A', 'B', 'C', 'D'])
  })
})
