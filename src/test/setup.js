import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Unmount React trees and reset mocks between tests so they don't leak state.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// Helper: stub global fetch with a queue of JSON responses.
// Usage: mockFetch([{ ok: true, json: [...] }, { ok: true, json: {...} }])
export function mockFetchSequence(responses) {
  const fetchMock = vi.fn()
  responses.forEach(({ ok = true, status = ok ? 200 : 400, json = {} }) => {
    fetchMock.mockResolvedValueOnce({
      ok,
      status,
      json: async () => json,
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
