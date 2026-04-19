import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('runs basic arithmetic', () => {
    expect(1 + 1).toBe(2)
  })

  it('has indexedDB available from fake-indexeddb', () => {
    expect(typeof indexedDB).toBe('object')
    expect(indexedDB).toBeTruthy()
  })
})
