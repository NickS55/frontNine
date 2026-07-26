import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BetaSignupForm } from './BetaSignupForm'

describe('BetaSignupForm', () => {
  it('walks through all three steps and submits the collected data', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(<BetaSignupForm />)

    // Step 1 — Continue is disabled until a role is chosen.
    const continue1 = screen.getByRole('button', { name: /continue/i })
    expect(continue1).toBeDisabled()
    await user.click(screen.getByText('Coach'))
    expect(continue1).toBeEnabled()
    await user.click(continue1)

    // Step 2 — level gate.
    expect(screen.getByText('Your Setup')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'High School' }))
    await user.type(screen.getByPlaceholderText(/Lincoln Mustangs/i), 'Test HS')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // Step 3 — submit disabled until name + valid email.
    const submit = screen.getByRole('button', { name: /submit application/i })
    expect(submit).toBeDisabled()
    await user.type(screen.getByPlaceholderText('Full name'), 'Coach Carter')
    await user.type(screen.getByPlaceholderText('you@example.com'), 'coach@example.com')
    expect(submit).toBeEnabled()
    await user.click(submit)

    // It POSTs once with the data gathered across steps.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body).toMatchObject({
      role: 'coach',
      level: 'High School',
      teamName: 'Test HS',
      name: 'Coach Carter',
      email: 'coach@example.com',
    })

    // Success screen renders.
    expect(await screen.findByText(/Application Received/i)).toBeInTheDocument()
  })

  it('shows an error message when the request fails', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))

    render(<BetaSignupForm />)
    await user.click(screen.getByText('Player'))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: 'Travel Ball' }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.type(screen.getByPlaceholderText('Full name'), 'Jo Player')
    await user.type(screen.getByPlaceholderText('you@example.com'), 'jo@example.com')
    await user.click(screen.getByRole('button', { name: /submit application/i }))

    expect(await screen.findByText(/Something went wrong/i)).toBeInTheDocument()
  })
})
