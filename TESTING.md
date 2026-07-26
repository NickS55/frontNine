# Testing — frontNine

Component tests run with **Vitest** + **React Testing Library** in a **jsdom** environment.

## Run

```bash
npm test          # one-shot
npm run test:watch
```

## How it works

- **`vite.config.js`** — `test` block: `jsdom` environment, global test APIs,
  `src/test/setup.js` loaded before each file, matches `src/**/*.test.{js,jsx}`.
- **`src/test/setup.js`** — pulls in `@testing-library/jest-dom` matchers,
  runs `cleanup()` + `vi.restoreAllMocks()` after each test, and exposes
  `mockFetchSequence()` for queuing fetch responses.
- Tests drive components with `@testing-library/user-event` and assert on what
  the user sees (roles/text), not implementation details. `fetch` is stubbed
  with `vi.stubGlobal`.

See `src/components/BetaSignupForm.test.jsx` for the reference pattern
(multi-step flow, disabled-until-valid gating, submit payload assertion, error state).

## The convention (every feature PR)

Any new interactive component or meaningful UI change ships a component test that
covers: it renders, validation/gating works, the correct request body is sent,
and success/error states show. Prefer extracting testable components out of large
page files (e.g. pull a form out of a `*Page.jsx`) over testing the whole page
with many mocked fetches.

Co-locate tests next to the component: `Foo.jsx` → `Foo.test.jsx`.
