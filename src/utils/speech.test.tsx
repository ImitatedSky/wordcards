import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { speakWord, canSpeak } from './speech'
import { WordCardDialog } from '@/components/common/WordCardDialog'
import { newCard } from '@/features/vocab/factories'

class FakeUtterance {
  text: string
  lang = ''
  rate = 1
  constructor(text: string) {
    this.text = text
  }
}

const speak = vi.fn()
const cancel = vi.fn()

beforeEach(() => {
  vi.stubGlobal('speechSynthesis', { speak, cancel })
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  speak.mockClear()
  cancel.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('speakWord', () => {
  it('reports availability from the global', () => {
    expect(canSpeak()).toBe(true)
  })

  it('cancels the previous word and speaks in English', () => {
    expect(speakWord('circumscribe')).toBe(true)
    expect(cancel).toHaveBeenCalled()
    expect(speak).toHaveBeenCalledTimes(1)
    const utterance = speak.mock.calls[0][0] as FakeUtterance
    expect(utterance.text).toBe('circumscribe')
    expect(utterance.lang).toBe('en-US')
  })

  it('rejects empty text', () => {
    expect(speakWord('   ')).toBe(false)
    expect(speak).not.toHaveBeenCalled()
  })
})

describe('WordCardDialog pronunciation button', () => {
  it('speaks the headword (without POS) on click', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <WordCardDialog card={newCard({ front: 'Circumscribe (v.)', back: '限制' })} onClose={() => {}} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: '唸出單字' }))
    const utterance = speak.mock.calls[0][0] as FakeUtterance
    expect(utterance.text).toBe('Circumscribe')
  })
})
