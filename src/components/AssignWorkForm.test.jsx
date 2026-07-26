import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssignWorkForm } from './AssignWorkForm'

describe('AssignWorkForm', () => {
  it('disables submit until title AND scheduled day are set, then POSTs the right body', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'a1' }) })
    vi.stubGlobal('fetch', fetchMock)
    const onSaved = vi.fn()

    render(<AssignWorkForm playerId="p1" authToken="tok" onSaved={onSaved} />)

    const submit = screen.getByRole('button', { name: /assign/i })
    expect(submit).toBeDisabled()

    await user.type(screen.getByPlaceholderText(/fastball command/i), 'Command work')
    expect(submit).toBeDisabled() // still no date

    const dateInput = screen.getByLabelText('Scheduled day')
    await user.type(dateInput, '2026-07-28')
    await user.selectOptions(screen.getByLabelText('Type'), 'long_toss')
    expect(submit).toBeEnabled()

    await user.click(submit)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/players/p1/assignments')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body)
    expect(body).toEqual({
      title: 'Command work',
      loadType: 'long_toss',
      intensity: 'high',
      dueDate: '2026-07-28',
    })
    // Binary model — never send a throw count.
    expect(body).not.toHaveProperty('targetThrowCount')
    expect(onSaved).toHaveBeenCalledWith({ id: 'a1' })
  })

  it('never sends targetThrowCount in the create payload (binary model)', async () => {
    // Regression: the old form sent targetThrowCount, which the new backend has
    // no notion of. Guard the payload so the two never drift back apart.
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'a1' }) })
    vi.stubGlobal('fetch', fetchMock)

    render(<AssignWorkForm playerId="p1" authToken="tok" onSaved={() => {}} />)
    await user.type(screen.getByPlaceholderText(/fastball command/i), 'X')
    await user.type(screen.getByLabelText('Scheduled day'), '2026-07-28')
    await user.click(screen.getByRole('button', { name: /assign/i }))

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('targetThrowCount')
    expect(body).not.toHaveProperty('completedThrowCount')
  })

  it('edits an existing assignment via PATCH', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'a9' }) })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AssignWorkForm
        playerId="p1"
        authToken="tok"
        assignment={{ id: 'a9', title: 'Old', loadType: 'bullpen', intensity: 'low', dueDate: '2026-07-20', notes: '' }}
        onSaved={() => {}}
      />
    )

    const title = screen.getByPlaceholderText(/fastball command/i)
    await user.clear(title)
    await user.type(title, 'New title')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/assignments/a9')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body).title).toBe('New title')
  })

  it('surfaces a server error', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'dueDate is required' }) }))

    render(<AssignWorkForm playerId="p1" authToken="tok" onSaved={() => {}} />)
    await user.type(screen.getByPlaceholderText(/fastball command/i), 'X')
    await user.type(screen.getByLabelText('Scheduled day'), '2026-07-28')
    await user.click(screen.getByRole('button', { name: /assign/i }))

    expect(await screen.findByText(/dueDate is required/i)).toBeInTheDocument()
  })
})
