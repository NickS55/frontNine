import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SupportPage from './SupportPage'

// Clerk only — react-router-dom stays real. A signed-out visitor is the default
// case for this page, so `user` is null unless a test says otherwise.
let clerkUser = { isSignedIn: false, isLoaded: true, user: null }

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => clerkUser,
  useAuth: () => ({ getToken: async () => 'test-token' }),
  UserButton: () => null,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SupportPage />
    </MemoryRouter>
  )
}

describe('SupportPage', () => {
  it('keeps submit disabled until name, email, and message are filled in', async () => {
    clerkUser = { isSignedIn: false, isLoaded: true, user: null }
    const user = userEvent.setup()
    renderPage()

    const submit = screen.getByRole('button', { name: /send message/i })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText(/your name/i), 'Casey Rivera')
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText(/email/i), 'coach@lincolnbaseball.org')
    expect(submit).toBeDisabled() // still no message

    await user.type(screen.getByLabelText(/message/i), 'My CSV upload failed.')
    expect(submit).toBeEnabled()
  })

  it('POSTs the form and shows the confirmation', async () => {
    clerkUser = { isSignedIn: false, isLoaded: true, user: null }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, id: 's1' }) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/your name/i), 'Casey Rivera')
    await user.type(screen.getByLabelText(/email/i), 'coach@lincolnbaseball.org')
    await user.click(screen.getByRole('button', { name: 'TrackMan upload' }))
    await user.type(screen.getByLabelText(/message/i), 'My CSV upload failed.')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/support-requests')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({
      name: 'Casey Rivera',
      email: 'coach@lincolnbaseball.org',
      topic: 'TrackMan upload',
      message: 'My CSV upload failed.',
    })

    expect(await screen.findByText(/message sent/i)).toBeInTheDocument()
  })

  it('starts blank for a signed-in user and lets them clear what they type', async () => {
    clerkUser = {
      isSignedIn: true,
      isLoaded: true,
      user: { id: 'u1', fullName: 'Casey Rivera', primaryEmailAddress: { emailAddress: 'coach@lincolnbaseball.org' } },
    }
    const user = userEvent.setup()
    renderPage()

    const nameField = screen.getByLabelText(/your name/i)
    expect(nameField).toHaveValue('')

    // A coach filing on someone else's behalf must be able to wipe the field.
    await user.type(nameField, 'Casey Rivera')
    await user.clear(nameField)
    expect(nameField).toHaveValue('')
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })

  it('tells the user how else to reach us when the send fails', async () => {
    clerkUser = { isSignedIn: false, isLoaded: true, user: null }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/your name/i), 'Casey Rivera')
    await user.type(screen.getByLabelText(/email/i), 'coach@lincolnbaseball.org')
    await user.type(screen.getByLabelText(/message/i), 'My CSV upload failed.')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    // The page always shows a mailto link, so assert on the error copy itself.
    expect(await screen.findByText(/that didn't send/i)).toBeInTheDocument()
    expect(screen.queryByText(/message sent/i)).not.toBeInTheDocument()
  })
})
