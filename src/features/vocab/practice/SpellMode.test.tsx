import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SpellMode } from './SpellMode'
import { newCard } from '../factories'

const card = newCard({ front: 'Ability (n.)', back: '能力' })
const choices = ['旅程', '能力', '倉庫', '勤勉']

function renderIt(onSubmit = vi.fn(), phase: 'prompting' | 'revealed' = 'prompting') {
  render(
    <SpellMode
      card={card}
      choices={choices}
      correctIndex={1}
      phase={phase}
      onSubmit={onSubmit}
      onNext={() => {}}
    />,
  )
  return onSubmit
}

const input = () => screen.getByRole('textbox', { name: /輸入單字/ })

describe('SpellMode', () => {
  it('shows no meaning options until the word is typed', () => {
    renderIt()
    expect(screen.queryByRole('button', { name: '能力' })).not.toBeInTheDocument()
  })

  it('a wrong letter keeps the user on the typing step', async () => {
    const user = userEvent.setup()
    renderIt()
    await user.type(input(), 'abilitx')
    expect(screen.queryByRole('button', { name: '能力' })).not.toBeInTheDocument()
  })

  it('typing the word (any case) moves on to the meaning options', async () => {
    const user = userEvent.setup()
    renderIt()
    await user.type(input(), 'ABILITY')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '能力' })).toBeInTheDocument()
  })

  it('a right first pick submits correct', async () => {
    const user = userEvent.setup()
    const onSubmit = renderIt()
    await user.type(input(), 'ability')
    await user.click(screen.getByRole('button', { name: '能力' }))
    expect(onSubmit).toHaveBeenCalledWith('correct')
  })

  it('a wrong pick sends the user back to retype, and the final result is incorrect', async () => {
    const user = userEvent.setup()
    const onSubmit = renderIt()
    await user.type(input(), 'ability')
    await user.click(screen.getByRole('button', { name: '倉庫' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('倉庫')
    expect(input()).toHaveValue('')

    await user.type(input(), 'ability')
    await user.click(screen.getByRole('button', { name: '能力' }))
    expect(onSubmit).toHaveBeenCalledWith('incorrect')
  })

  it('once revealed, options are locked and the next button is shown', () => {
    renderIt(vi.fn(), 'revealed')
    expect(screen.getByRole('button', { name: /能力/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /下一題/ })).toBeInTheDocument()
  })
})
