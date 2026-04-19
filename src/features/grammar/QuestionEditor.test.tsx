import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionEditor } from './QuestionEditor'

describe('QuestionEditor (create)', () => {
  it('rejects submit when prompt is empty (MC)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<QuestionEditor mode="create" onSave={onSave} onCancel={() => {}} />)
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('題目 必填')).toBeInTheDocument()
  })

  it('creates an MC question with filled options and selected correct', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<QuestionEditor mode="create" onSave={onSave} onCancel={() => {}} />)
    await user.type(screen.getByLabelText('題目'), 'She ___ to school.')
    const opts = screen.getAllByLabelText(/^選項 \d+$/)
    await user.type(opts[0], 'go')
    await user.type(opts[1], 'goes')
    await user.type(opts[2], 'going')
    await user.type(opts[3], 'gone')
    await user.click(screen.getAllByLabelText('此為正解')[1])
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    const arg = onSave.mock.calls[0][0]
    expect(arg.type).toBe('multiple_choice')
    expect(arg.prompt).toBe('She ___ to school.')
    expect(arg.options).toEqual(['go', 'goes', 'going', 'gone'])
    expect(arg.correctIndex).toBe(1)
  })

  it('rejects MC submit when the chosen option is blank', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<QuestionEditor mode="create" onSave={onSave} onCancel={() => {}} />)
    await user.type(screen.getByLabelText('題目'), 'p')
    const opts = screen.getAllByLabelText(/^選項 \d+$/)
    await user.type(opts[0], 'a')
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('至少 2 個非空選項，且正解必須非空')).toBeInTheDocument()
  })

  it('switches to FIB, keeps prompt, resets type-specific fields', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<QuestionEditor mode="create" onSave={onSave} onCancel={() => {}} />)
    await user.type(screen.getByLabelText('題目'), 'The sky ___ blue.')
    await user.click(screen.getByLabelText('填空'))
    expect(screen.getByLabelText('題目')).toHaveValue('The sky ___ blue.')
    await user.type(screen.getByLabelText('答案 1'), 'is')
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    const arg = onSave.mock.calls[0][0]
    expect(arg.type).toBe('fill_in_blank')
    expect(arg.answers).toEqual(['is'])
    expect(arg.caseSensitive).toBe(false)
  })

  it('rejects FIB submit with no non-empty answers', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<QuestionEditor mode="create" onSave={onSave} onCancel={() => {}} />)
    await user.click(screen.getByLabelText('填空'))
    await user.type(screen.getByLabelText('題目'), 'p')
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('至少 1 個非空答案')).toBeInTheDocument()
  })
})

describe('QuestionEditor (edit)', () => {
  it('pre-fills MC fields and disables the type radio', () => {
    render(
      <QuestionEditor
        mode="edit"
        initial={{
          type: 'multiple_choice',
          prompt: 'p',
          options: ['a', 'b', 'c', 'd'],
          correctIndex: 2,
          explanation: 'x',
          notes: 'n',
        }}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByLabelText('題目')).toHaveValue('p')
    const opts = screen.getAllByLabelText(/^選項 \d+$/) as HTMLInputElement[]
    expect(opts[2].value).toBe('c')
    expect(screen.getByLabelText('選擇題')).toBeDisabled()
    expect(screen.getByLabelText('填空')).toBeDisabled()
  })

  it('pre-fills FIB fields', () => {
    render(
      <QuestionEditor
        mode="edit"
        initial={{
          type: 'fill_in_blank',
          prompt: 'p',
          answers: ['a', 'b'],
          caseSensitive: true,
        }}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByLabelText('答案 1')).toHaveValue('a')
    expect(screen.getByLabelText('答案 2')).toHaveValue('b')
    expect(screen.getByLabelText('區分大小寫')).toBeChecked()
  })
})
