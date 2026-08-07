import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PlayerProfilePage from './PlayerProfilePage'

// Clerk only — react-router-dom stays real.
//
// `getToken` is in the page's effect deps, so the stub must return the SAME
// function identity on every render the way Clerk's real hook does. Building a
// fresh one per call re-triggers the effect forever and the page never settles.
const getToken = async () => 'test-token'
const auth = { getToken }
const clerkUser = { isSignedIn: true, isLoaded: true, user: { id: 'u1' } }

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => auth,
  // The shared Header renders inside the page and reads these.
  useUser: () => clerkUser,
  UserButton: () => null,
}))

const PLAYER = {
  id: 'p1',
  name: 'Casey Rivera',
  status: 'active',
  handedness: 'right',
  positions: ['pitcher'],
  heightCm: 188,
  weightKg: 88,
}

function statsFixture(overrides = {}) {
  return {
    windowDays: 30,
    totals: {
      trackedPitches: 240, trackedSessions: 6, gameSessions: 4,
      bullpenSessions: 2, bullpenPitches: 50,
      firstTrackedDate: '2026-04-02', lastTrackedDate: '2026-07-30',
    },
    velocity: {
      topVelo: 95.2, fastballAvg: 91.4, recentFbAvg: 92.1, recentFbMax: 95.2,
      recentPitches: 60, priorFbAvg: 90.3, priorPitches: 55, fbTrend: 1.8,
    },
    arsenal: [
      {
        pitchType: 'Four-Seam', pitches: 140, usagePct: 58.3, avgVelo: 91.4, maxVelo: 95.2,
        avgSpin: 2280, avgIvb: 16.4, avgHb: 9.1, avgExtension: 6.2,
        avgRelHeight: 6.01, avgRelSide: -1.8, strikePct: 64.3, zonePct: 51.2,
        whiffPct: 21.5, swings: 60,
      },
      {
        pitchType: 'Slider', pitches: 100, usagePct: 41.7, avgVelo: 83.2, maxVelo: 86.0,
        avgSpin: 2460, avgIvb: 1.2, avgHb: -8.7, avgExtension: 6.0,
        avgRelHeight: 5.94, avgRelSide: -1.85, strikePct: 58.0, zonePct: 40.0,
        whiffPct: 34.2, swings: 45,
      },
    ],
    release: { avgRelHeight: 5.98, avgRelSide: -1.82, avgExtension: 6.14 },
    command: {
      strikePct: 61.7, zonePct: 46.5, firstPitchStrikePct: 63.0,
      firstPitches: 54, whiffPct: 26.7, swings: 105,
    },
    outcomes: {
      strikeouts: 22, walks: 8, hitByPitch: 1, kbbRatio: 2.75,
      battedBalls: 40, avgExitSpeed: 86.3, maxExitSpeed: 104.1, hardHitPct: 32.5,
    },
    bullpen: {
      sessions: 2, pitches: 50, avgScore: 68.4, bestScore: 74.0,
      avgVelo: 88.1, maxVelo: 91.0, lastSession: '2026-07-28T00:00:00Z',
    },
    readiness: {
      checkins: 18, avgReadiness: 7.4, avgSoreness: 3.1,
      firstCheck: '2026-07-01', lastCheck: '2026-07-30',
    },
    veloTrend: [
      { uploadId: 'u1', date: '2026-07-10', sessionType: 'game', pitches: 45, avgVelo: 88.0, maxVelo: 93.0, avgFb: 90.8, maxFb: 93.0 },
      { uploadId: 'u2', date: '2026-07-30', sessionType: 'game', pitches: 52, avgVelo: 89.1, maxVelo: 95.2, avgFb: 92.1, maxFb: 95.2 },
    ],
    ...overrides,
  }
}

const COMPS = {
  handedness: 'R',
  normalized: true,
  comps: [
    {
      pitchType: 'Four-Seam', mlbCode: 'FF', pitches: 140,
      player: { velocity: 91.4, ivb: 16.4, hb: 9.1, spinRate: 2280, spinAxis: 210, releaseHeight: 6.01, releaseSide: -1.8, extension: 6.2 },
      matches: [
        { mlb_id: 1, player_name: 'Twin Fastball', pitch_type: 'FF', similarity_pct: 94, velocity_avg: 92.0, ivb_avg: 16.1, hb_avg: 9.4, spin_rate_avg: 2310 },
        { mlb_id: 2, player_name: 'Second Best',   pitch_type: 'FF', similarity_pct: 81, velocity_avg: 94.0, ivb_avg: 14.0, hb_avg: 11.0, spin_rate_avg: 2400 },
      ],
    },
  ],
}

const COLLEGE_DIVISIONS = [
  { value: 'd1_elite', label: 'D1 Power Conference' },
  { value: 'd1_mid', label: 'D1 Mid-Major' },
  { value: 'd1_low', label: 'D1 Low-Major' },
  { value: 'd2', label: 'D2' },
  { value: 'd3', label: 'D3' },
  { value: 'naia_juco', label: 'NAIA / JUCO' },
]

const BENCHMARKS = {
  handedness: 'right',
  collegeDivisions: COLLEGE_DIVISIONS,
  pitches: [
    {
      pitchType: 'Four-Seam', pitches: 140,
      metrics: [
        {
          metric: 'velocity', label: 'Velocity', unit: 'mph', value: 91.4,
          percentiles: {
            high_school: 99,
            college: { d1_elite: 22, d1_mid: 82, d1_low: 91, d2: 88, d3: 96, naia_juco: 85 },
            mlb: 41,
          },
        },
        {
          metric: 'spinRate', label: 'Spin Rate', unit: 'rpm', value: 2280,
          percentiles: {
            high_school: 95,
            college: { d1_elite: 71, d1_mid: 71, d1_low: 71, d2: 71, d3: 71, naia_juco: 71 },
            mlb: 38,
          },
        },
      ],
    },
  ],
}

const STUFF_TREND = {
  model: { id: 'tjstuff_plus_v3_2020_2023', name: 'tjStuff+ (v3, MLB-calibrated)' },
  trend: [
    { uploadId: 'u1', date: '2026-07-10', sessionType: 'game', pitches: 45, stuffPlus: 92.1 },
    { uploadId: 'u2', date: '2026-07-30', sessionType: 'game', pitches: 52, stuffPlus: 101.4 },
  ],
}

// The page hits five endpoints and fires them from four effects, so ordering
// a queue of responses is brittle. Dispatch on the URL instead.
function mockApi({
  player = PLAYER, stats = statsFixture(), comps = COMPS, benchmarks = BENCHMARKS,
  stuffTrend = STUFF_TREND, fail = {},
} = {}) {
  const fetchMock = vi.fn(async (url) => {
    const respond = (json, key) => (
      fail[key]
        ? { ok: false, status: fail[key], json: async () => ({}) }
        : { ok: true, status: 200, json: async () => json }
    )
    if (url.includes('/comps')) return respond(comps, 'comps')
    if (url.includes('/benchmarks')) return respond(benchmarks, 'benchmarks')
    if (url.includes('/stuff-trend')) return respond(stuffTrend, 'stuffTrend')
    if (url.includes('/profile-stats')) return respond(stats, 'stats')
    return respond(player, 'player')
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderAt(path = '/profile/p1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/profile" element={<PlayerProfilePage />} />
        <Route path="/profile/:profileId" element={<PlayerProfilePage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PlayerProfilePage', () => {
  // Several numbers appear both in a headline tile and in the arsenal table,
  // so tile assertions are scoped to the tile that carries the label.
  function tileValue(label) {
    return screen.getByText(label).closest('div').textContent
  }

  it('renders the headline performance numbers', async () => {
    mockApi()
    renderAt()

    expect(await screen.findByText('Casey Rivera')).toBeInTheDocument()

    expect(tileValue('Avg Fastball')).toContain('91.4')
    expect(tileValue('Top Velo')).toContain('95.2')
    expect(tileValue('Strike Rate')).toContain('61.7')
    expect(tileValue('Whiff Rate')).toContain('26.7')

    // The velo gain over the window is called out with its direction.
    expect(tileValue('Avg Fastball')).toContain('1.8')
    expect(tileValue('Avg Fastball')).toContain('vs prior 30d')
  })

  it('lists every arsenal pitch with its averages', async () => {
    mockApi()
    renderAt()

    // Pitch names also appear in the movement legend and the comps section, so
    // scope this to the arsenal table itself.
    await screen.findByText('140 thrown')
    const table = within(screen.getByRole('table', { name: 'Arsenal' }))

    expect(table.getByText('Four-Seam')).toBeInTheDocument()
    expect(table.getByText('Slider')).toBeInTheDocument()
    expect(table.getByText('140 thrown')).toBeInTheDocument()
    expect(table.getByText('58.3%')).toBeInTheDocument()
    expect(table.getByText('2280')).toBeInTheDocument()
    // Break is signed so arm side vs glove side reads at a glance.
    expect(table.getByText('+16.4"')).toBeInTheDocument()
    expect(table.getByText('-8.7"')).toBeInTheDocument()
  })

  it('shows MLB comps with a you-vs-them table, closest arm first', async () => {
    mockApi()
    renderAt()

    expect(await screen.findByText('Twin Fastball')).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
    expect(screen.getByText('Second Best')).toBeInTheDocument()

    const card = within(screen.getByRole('table', { name: 'Twin Fastball comparison' }))
    expect(card.getByText('92.0 mph')).toBeInTheDocument()   // MLB velo
    expect(card.getByText('91.4 mph')).toBeInTheDocument()   // the player's
  })

  it('refetches comps unnormalized when the velocity toggle is switched off', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi()
    renderAt()

    await screen.findByText('Twin Fastball')
    const toggle = screen.getByRole('switch', { name: /normalize for velocity/i })
    // Normalizing is the default — the first request says so.
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(fetchMock.mock.calls.find(c => c[0].includes('/comps'))[0])
      .toContain('normalizeVelocity=true')

    await user.click(toggle)

    await waitFor(() => {
      expect(fetchMock.mock.calls.at(-1)[0]).toContain('normalizeVelocity=false')
    })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('explains why comps are missing instead of showing an error', async () => {
    mockApi({ comps: { comps: [], normalized: true, reason: 'handedness_unknown' } })
    renderAt()

    expect(await screen.findByText(/Set this player’s handedness/)).toBeInTheDocument()
  })

  it('degrades only the comps card when that request fails', async () => {
    mockApi({ fail: { comps: 500 } })
    renderAt()

    // The comps card settles after the rest of the page, so wait on it.
    expect(await screen.findByText(/Couldn’t load comparisons/)).toBeInTheDocument()
    // The rest of the profile still renders.
    expect(screen.getByText('Casey Rivera')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Arsenal' })).toBeInTheDocument()
  })

  it('renders the Stuff+ trend chart when graded sessions are available', async () => {
    mockApi()
    renderAt()

    expect(await screen.findByText('Stuff+ Over Time')).toBeInTheDocument()
    expect(await screen.findByText(/tjStuff\+ \(v3, MLB-calibrated\)/)).toBeInTheDocument()
  })

  it('explains that Stuff+ needs at least two graded sessions', async () => {
    mockApi({ stuffTrend: { model: STUFF_TREND.model, trend: [STUFF_TREND.trend[0]] } })
    renderAt()

    expect(await screen.findByText(/Two or more graded sessions/)).toBeInTheDocument()
  })

  it('shows Stuff+ as unavailable rather than an error when the model service is unconfigured', async () => {
    mockApi({ fail: { stuffTrend: 503 } })
    renderAt()

    expect(await screen.findByText(/Stuff\+ scoring isn.t configured/)).toBeInTheDocument()
    // The rest of the page still renders.
    expect(screen.getByText('Casey Rivera')).toBeInTheDocument()
  })

  it('shows benchmark percentiles for the default (high school) level', async () => {
    mockApi()
    renderAt()

    // "99th pctl" only appears in the benchmark bar — the player's raw 91.4
    // mph velocity is also echoed in the MLB comps card, so assert on the
    // percentile label instead of the ambiguous value text.
    expect(await screen.findByText('99th pctl')).toBeInTheDocument()
  })

  it('switches benchmark level when a different bracket is selected', async () => {
    const user = userEvent.setup()
    mockApi()
    renderAt()

    await screen.findByText('99th pctl')
    await user.click(screen.getByRole('button', { name: 'College' }))

    expect(await screen.findByText('82nd pctl')).toBeInTheDocument()
    expect(screen.queryByText('99th pctl')).not.toBeInTheDocument()
  })

  it('switches college division without changing the level', async () => {
    const user = userEvent.setup()
    mockApi()
    renderAt()

    await screen.findByText('99th pctl')
    await user.click(screen.getByRole('button', { name: 'College' }))
    expect(await screen.findByText('82nd pctl')).toBeInTheDocument() // d1_mid default

    await user.selectOptions(screen.getByRole('combobox'), 'd1_elite')
    expect(await screen.findByText('22nd pctl')).toBeInTheDocument()
    expect(screen.queryByText('82nd pctl')).not.toBeInTheDocument()
  })

  it('degrades only the benchmarks card when that request fails', async () => {
    mockApi({ fail: { benchmarks: 500 } })
    renderAt()

    expect(await screen.findByText(/Couldn’t load benchmarks/)).toBeInTheDocument()
    expect(screen.getByText('Casey Rivera')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Arsenal' })).toBeInTheDocument()
  })

  it('requests the stats for the profile in the URL', async () => {
    const fetchMock = mockApi()
    renderAt('/profile/p1')

    await screen.findByText('Casey Rivera')
    expect(fetchMock.mock.calls[0][0]).toContain('/players/p1')
    expect(fetchMock.mock.calls[1][0]).toContain('/players/p1/profile-stats?days=30')
  })

  it('falls back to /players/me when no profile id is in the URL', async () => {
    const fetchMock = mockApi()
    renderAt('/profile')

    await screen.findByText('Casey Rivera')
    expect(fetchMock.mock.calls[0][0]).toContain('/players/me')
    // The stats call still uses the resolved profile id, not "me".
    expect(fetchMock.mock.calls[1][0]).toContain('/players/p1/profile-stats')
  })

  it('refetches with a wider window when the range is changed', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi({ stats: statsFixture({ windowDays: 90 }) })
    renderAt()

    await screen.findByText('Casey Rivera')
    await user.click(screen.getByRole('button', { name: '90d' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.at(-1)[0]).toContain('days=90')
    })
    expect(await screen.findByText(/Arm Feel · last 90 days/)).toBeInTheDocument()
  })

  it('shows an empty state instead of blank tiles for a player with no tracked pitches', async () => {
    const empty = statsFixture({
      totals: { trackedPitches: 0, trackedSessions: 0, gameSessions: 0, bullpenSessions: 0, bullpenPitches: 0, firstTrackedDate: null, lastTrackedDate: null },
      velocity: { topVelo: null, fastballAvg: null, recentFbAvg: null, recentFbMax: null, recentPitches: 0, priorFbAvg: null, priorPitches: 0, fbTrend: null },
      arsenal: [],
      command: { strikePct: null, zonePct: null, firstPitchStrikePct: null, firstPitches: 0, whiffPct: null, swings: 0 },
      veloTrend: [],
    })
    mockApi({ stats: empty, comps: { ...COMPS, comps: [], reason: 'no_tracked_pitches' } })
    renderAt()

    expect(await screen.findByText('No tracked pitches yet')).toBeInTheDocument()
    expect(screen.getByText('No tracked pitches yet.')).toBeInTheDocument()
    expect(screen.getByText(/Two or more tracked sessions/)).toBeInTheDocument()
    // Missing metrics render as em dashes, never NaN or "null".
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('surfaces a load failure instead of rendering a half-empty page', async () => {
    mockApi({ fail: { stats: 500 } })
    renderAt()

    expect(await screen.findByText(/Could not load performance stats \(500\)/)).toBeInTheDocument()
    expect(screen.queryByText('Casey Rivera')).not.toBeInTheDocument()
  })
})
