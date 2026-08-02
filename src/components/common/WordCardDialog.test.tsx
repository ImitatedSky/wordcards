import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WordCardDialog } from './WordCardDialog'
import {
  getCardDisplayPrefs,
  setCardDisplayPrefs,
} from '@/utils/cardDisplayPrefs'
import { newCard } from '@/features/vocab/factories'

const card = newCard({ front: 'Circumscribe (v.)', back: '限制' })

function renderDialog() {
  return render(
    <MemoryRouter>
      <WordCardDialog card={card} onClose={() => {}} />
    </MemoryRouter>,
  )
}

afterEach(() => localStorage.clear())

describe('cardDisplayPrefs', () => {
  it('defaults to small size and font', () => {
    expect(getCardDisplayPrefs()).toEqual({ size: 'sm', fontSize: 'sm' })
  })

  it('persists partial updates', () => {
    setCardDisplayPrefs({ size: 'lg' })
    expect(getCardDisplayPrefs()).toEqual({ size: 'lg', fontSize: 'sm' })
    setCardDisplayPrefs({ fontSize: 'md' })
    expect(getCardDisplayPrefs()).toEqual({ size: 'lg', fontSize: 'md' })
  })

  it('falls back to defaults on corrupted storage', () => {
    localStorage.setItem('cardDisplayPrefs', '{not json')
    expect(getCardDisplayPrefs()).toEqual({ size: 'sm', fontSize: 'sm' })
    localStorage.setItem('cardDisplayPrefs', JSON.stringify({ size: 'huge' }))
    expect(getCardDisplayPrefs().size).toBe('sm')
  })
})

describe('WordCardDialog display prefs', () => {
  it('uses the small width and font by default', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog', { name: '單字卡：Circumscribe' })
    expect(dialog.className).toContain('max-w-sm')
    expect(screen.getByRole('heading', { name: 'Circumscribe (v.)' }).className).toContain('text-2xl')
  })

  it('applies the configured size and font level', () => {
    setCardDisplayPrefs({ size: 'lg', fontSize: 'lg' })
    renderDialog()
    const dialog = screen.getByRole('dialog', { name: '單字卡：Circumscribe' })
    expect(dialog.className).toContain('max-w-2xl')
    expect(screen.getByRole('heading', { name: 'Circumscribe (v.)' }).className).toContain('text-4xl')
  })
})
