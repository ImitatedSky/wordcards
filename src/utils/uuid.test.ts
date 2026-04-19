import { describe, it, expect } from 'vitest'
import { newId } from './uuid'

describe('newId', () => {
  it('returns a non-empty string', () => {
    const id = newId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns distinct values on successive calls', () => {
    const a = newId()
    const b = newId()
    expect(a).not.toBe(b)
  })
})
