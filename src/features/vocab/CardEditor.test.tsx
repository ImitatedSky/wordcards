import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardEditor } from './CardEditor'

describe('CardEditor', () => {
  it('rejects submit when front is empty', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<CardEditor mode="create" onSave={onSave} onCancel={() => {}} />)
    await user.type(screen.getByLabelText('背面'), '你好')
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('正面 必填')).toBeInTheDocument()
  })

  it('rejects submit when back is empty', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<CardEditor mode="create" onSave={onSave} onCancel={() => {}} />)
    await user.type(screen.getByLabelText('正面'), 'hello')
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with the form values', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<CardEditor mode="create" onSave={onSave} onCancel={() => {}} />)
    await user.type(screen.getByLabelText('正面'), 'hello')
    await user.type(screen.getByLabelText('背面'), '你好')
    await user.type(screen.getByLabelText('例句'), 'hello world')
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(onSave).toHaveBeenCalledWith({
      front: 'hello',
      back: '你好',
      example: 'hello world',
      pronunciation: '',
      notes: '',
    })
  })

  it('pre-fills fields in edit mode', () => {
    render(
      <CardEditor
        mode="edit"
        initial={{ front: 'x', back: 'y', example: 'e', pronunciation: 'p', notes: 'n' }}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByLabelText('正面')).toHaveValue('x')
    expect(screen.getByLabelText('背面')).toHaveValue('y')
    expect(screen.getByLabelText('例句')).toHaveValue('e')
    expect(screen.getByLabelText('發音')).toHaveValue('p')
    expect(screen.getByLabelText('備註')).toHaveValue('n')
  })

  it('cancel button calls onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<CardEditor mode="create" onSave={() => {}} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
