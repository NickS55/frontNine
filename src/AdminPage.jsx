import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { Header } from './components/Header'
import { FloatingEquipment } from './components/FloatingEquipment'

const BASE_URL = 'https://backnine-production-eb29.up.railway.app'
const columnHelper = createColumnHelper()

const TEAM_LEVELS = [
  'recreational', 'beer_league', 'amateur', 'travel',
  'high_school', 'college', 'independent', 'semi_pro',
  'minor_league', 'professional',
]

// ── shared helpers ─────────────────────────────────────────────────────────

function Table({ table }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(header => (
                <th
                  key={header.id}
                  className="px-4 py-3 select-none"
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === 'asc' && ' ↑'}
                  {header.column.getIsSorted() === 'desc' && ' ↓'}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-muted/30 transition-colors">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fmtDate(val) {
  return new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// options: [{ id, name?, email? }]
function ProfileSelect({ value, onChange, options, placeholder }) {
  function label(o) {
    if (o.name && o.email) return `${o.name} — ${o.email}`
    return o.name ?? o.email ?? o.id
  }
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.id} value={o.id}>{label(o)}</option>
      ))}
    </select>
  )
}

function DangerButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="rounded px-2 py-1 text-xs text-destructive border border-destructive/40 hover:bg-destructive/10 transition-colors"
    >
      {children}
    </button>
  )
}

function ActionButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="rounded px-2 py-1 text-xs border border-border hover:bg-muted/50 transition-colors"
    >
      {children}
    </button>
  )
}

// ── Users tab ──────────────────────────────────────────────────────────────

function UsersTab({ getToken }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sorting, setSorting] = useState([])

  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = await getToken()
        const res = await fetch(`${BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 403) { setError('Access denied — admins only.'); return }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setUsers(await res.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [getToken])

  async function updateRole(userId, newRole) {
    const token = await getToken()
    const res = await fetch(`${BASE_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
  }

  async function toggleAdmin(userId, isAdmin) {
    const token = await getToken()
    const res = await fetch(`${BASE_URL}/users/${userId}/is-admin`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdmin }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
  }

  const columns = useMemo(() => [
    columnHelper.accessor('email', {
      header: 'Email',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('role', {
      header: 'Role',
      cell: info => {
        const row = info.row.original
        return (
          <select
            value={info.getValue()}
            onChange={e => updateRole(row.id, e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="player">player</option>
            <option value="coach">coach</option>
          </select>
        )
      },
    }),
    columnHelper.accessor('isAdmin', {
      header: 'Admin',
      cell: info => {
        const row = info.row.original
        return (
          <input
            type="checkbox"
            checked={info.getValue()}
            onChange={e => toggleAdmin(row.id, e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-primary"
          />
        )
      },
      enableSorting: false,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Joined',
      cell: info => fmtDate(info.getValue()),
    }),
    columnHelper.accessor('id', {
      header: 'ID',
      cell: info => <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>,
      enableSorting: false,
    }),
  ], [])

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (loading) return <p className="text-muted-foreground">Loading…</p>
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <>
      <Table table={table} />
      <div className="mt-2 text-xs text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''}</div>
    </>
  )
}

// ── Team detail sub-tabs ───────────────────────────────────────────────────

function RequestsSection({ teamId, getToken }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const token = await getToken()
    const res = await fetch(`${BASE_URL}/teams/${teamId}/requests?status=pending`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setRequests(await res.json())
    setLoading(false)
  }, [teamId, getToken])

  useEffect(() => { load() }, [load])

  async function review(requestId, status) {
    const token = await getToken()
    await fetch(`${BASE_URL}/teams/${teamId}/requests/${requestId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setRequests(prev => prev.filter(r => r.id !== requestId))
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>
  if (requests.length === 0) return <p className="text-muted-foreground text-sm">No pending requests.</p>

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Name / Email</th>
            <th className="px-4 py-3">Jersey</th>
            <th className="px-4 py-3">Requested</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {requests.map(r => (
            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 capitalize">{r.role}</td>
              <td className="px-4 py-3">{r.playerName ?? r.userEmail ?? '—'}</td>
              <td className="px-4 py-3">{r.jerseyNumber ?? '—'}</td>
              <td className="px-4 py-3">{fmtDate(r.requestedAt)}</td>
              <td className="px-4 py-3 flex gap-2">
                <ActionButton onClick={() => review(r.id, 'accepted')}>Accept</ActionButton>
                <DangerButton onClick={() => review(r.id, 'rejected')}>Reject</DangerButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CoachesSection({ teamId, getToken }) {
  const [coaches, setCoaches] = useState([])
  const [allProfiles, setAllProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [addUserId, setAddUserId] = useState('')

  const load = useCallback(async () => {
    const token = await getToken()
    const [membersRes, profilesRes] = await Promise.all([
      fetch(`${BASE_URL}/teams/${teamId}/members`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${BASE_URL}/coach-profiles`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
    if (membersRes.ok) setCoaches((await membersRes.json()).coaches)
    if (profilesRes.ok) setAllProfiles(await profilesRes.json())
    setLoading(false)
  }, [teamId, getToken])

  useEffect(() => { load() }, [load])

  async function removeCoach(userId) {
    const token = await getToken()
    await fetch(`${BASE_URL}/coaches/${userId}/teams/${teamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setCoaches(prev => prev.filter(c => c.userId !== userId))
  }

  async function addCoach() {
    if (!addUserId) return
    const token = await getToken()
    const res = await fetch(`${BASE_URL}/coaches/${addUserId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId }),
    })
    if (res.ok) {
      const added = await res.json()
      const profile = allProfiles.find(p => p.userId === addUserId)
      setCoaches(prev => [...prev, {
        id: added.id, userId: addUserId,
        name: profile?.name ?? null, email: profile?.email ?? null,
        joinedAt: added.joinedAt,
      }])
      setAddUserId('')
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>

  const available = allProfiles
    .filter(p => !coaches.some(c => c.userId === p.userId))
    .map(p => ({ id: p.userId, name: p.name, email: p.email }))

  return (
    <div className="space-y-3">
      {coaches.length === 0
        ? <p className="text-muted-foreground text-sm">No coaches on this team.</p>
        : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coaches.map(c => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">{c.name ?? '—'}</td>
                    <td className="px-4 py-3">{c.email}</td>
                    <td className="px-4 py-3">{fmtDate(c.joinedAt)}</td>
                    <td className="px-4 py-3">
                      <DangerButton onClick={() => removeCoach(c.userId)}>Remove</DangerButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <ProfileSelect
            value={addUserId}
            onChange={setAddUserId}
            options={available}
            placeholder="Add coach…"
          />
          <ActionButton onClick={addCoach}>Add</ActionButton>
        </div>
      )}
    </div>
  )
}

function PlayersSection({ teamId, getToken }) {
  const [players, setPlayers] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [addPlayerId, setAddPlayerId] = useState('')
  const [addJersey, setAddJersey] = useState('')

  const load = useCallback(async () => {
    const token = await getToken()
    const [membersRes, playersRes] = await Promise.all([
      fetch(`${BASE_URL}/teams/${teamId}/members`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${BASE_URL}/players`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
    if (membersRes.ok) {
      const data = await membersRes.json()
      setPlayers(data.players)
    }
    if (playersRes.ok) setAllPlayers(await playersRes.json())
    setLoading(false)
  }, [teamId, getToken])

  useEffect(() => { load() }, [load])

  async function removePlayer(playerId) {
    const token = await getToken()
    await fetch(`${BASE_URL}/players/${playerId}/teams/${teamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setPlayers(prev => prev.filter(p => p.playerId !== playerId))
  }

  async function addPlayer() {
    if (!addPlayerId) return
    const token = await getToken()
    const body = { teamId }
    if (addJersey !== '') body.jerseyNumber = parseInt(addJersey, 10)
    const res = await fetch(`${BASE_URL}/players/${addPlayerId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const added = await res.json()
      const profile = allPlayers.find(p => p.id === addPlayerId)
      setPlayers(prev => [...prev, {
        id:           added.id,
        playerId:     addPlayerId,
        name:         profile?.name ?? '—',
        jerseyNumber: added.jerseyNumber,
        isActive:     true,
        joinedAt:     added.joinedAt,
      }])
      setAddPlayerId('')
      setAddJersey('')
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>

  const available = allPlayers.filter(p => !players.some(m => m.playerId === p.id))

  return (
    <div className="space-y-3">
      {players.length === 0
        ? <p className="text-muted-foreground text-sm">No players on this team.</p>
        : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Jersey</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {players.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">{p.jerseyNumber ?? '—'}</td>
                    <td className="px-4 py-3">{p.isActive ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{fmtDate(p.joinedAt)}</td>
                    <td className="px-4 py-3">
                      <DangerButton onClick={() => removePlayer(p.playerId)}>Remove</DangerButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <ProfileSelect
            value={addPlayerId}
            onChange={setAddPlayerId}
            options={available.map(p => ({ id: p.id, name: p.name, email: p.email }))}
            placeholder="Add player…"
          />
          <input
            type="number"
            min="0"
            max="99"
            placeholder="Jersey #"
            value={addJersey}
            onChange={e => setAddJersey(e.target.value)}
            className="w-24 rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <ActionButton onClick={addPlayer}>Add</ActionButton>
        </div>
      )}
    </div>
  )
}

// ── Teams tab ──────────────────────────────────────────────────────────────

function TeamsTab({ getToken }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [detailTab, setDetailTab] = useState('requests')
  const [newName, setNewName] = useState('')
  const [newLevel, setNewLevel] = useState(TEAM_LEVELS[0])
  const [creating, setCreating] = useState(false)
  const [sorting, setSorting] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const res = await fetch(`${BASE_URL}/teams`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setTeams(await res.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getToken])

  async function createTeam(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const token = await getToken()
    const res = await fetch(`${BASE_URL}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), level: newLevel }),
    })
    if (res.ok) {
      const team = await res.json()
      setTeams(prev => [...prev, team].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
    }
    setCreating(false)
  }

  async function deleteTeam(teamId) {
    const token = await getToken()
    const res = await fetch(`${BASE_URL}/teams/${teamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setTeams(prev => prev.filter(t => t.id !== teamId))
      if (selectedTeam?.id === teamId) setSelectedTeam(null)
    }
  }

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => (
        <button
          className="text-left hover:underline text-primary"
          onClick={() => {
            setSelectedTeam(info.row.original)
            setDetailTab('requests')
          }}
        >
          {info.getValue()}
        </button>
      ),
    }),
    columnHelper.accessor('level', {
      header: 'Level',
      cell: info => <span className="capitalize">{info.getValue().replace('_', ' ')}</span>,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: info => fmtDate(info.getValue()),
    }),
    columnHelper.accessor('id', {
      header: '',
      cell: info => (
        <DangerButton onClick={() => deleteTeam(info.getValue())}>Delete</DangerButton>
      ),
      enableSorting: false,
    }),
  ], [])

  const table = useReactTable({
    data: teams,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (loading) return <p className="text-muted-foreground">Loading…</p>
  if (error) return <p className="text-destructive">{error}</p>

  const subTabs = ['requests', 'coaches', 'players']

  return (
    <div className="space-y-6">
      {/* Create team */}
      <form onSubmit={createTeam} className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">Team name</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. River Dogs"
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">Level</label>
          <select
            value={newLevel}
            onChange={e => setNewLevel(e.target.value)}
            className="rounded border border-border bg-background px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {TEAM_LEVELS.map(l => (
              <option key={l} value={l}>{l.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {creating ? 'Creating…' : 'Create Team'}
        </button>
      </form>

      {/* Teams table */}
      {teams.length === 0
        ? <p className="text-muted-foreground text-sm">No teams yet.</p>
        : (
          <>
            <Table table={table} />
            <div className="text-xs text-muted-foreground">{teams.length} team{teams.length !== 1 ? 's' : ''}</div>
          </>
        )
      }

      {/* Team detail */}
      {selectedTeam && (
        <div className="rounded-lg border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {selectedTeam.name}
              <span className="ml-2 text-sm font-normal text-muted-foreground capitalize">
                {selectedTeam.level.replace('_', ' ')}
              </span>
            </h2>
            <button
              onClick={() => setSelectedTeam(null)}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Close
            </button>
          </div>

          {/* Sub-tab buttons */}
          <div className="flex gap-1 border-b border-border pb-0">
            {subTabs.map(t => (
              <button
                key={t}
                onClick={() => setDetailTab(t)}
                className={`px-4 py-2 text-sm capitalize transition-colors border-b-2 -mb-px ${
                  detailTab === t
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {detailTab === 'requests' && (
            <RequestsSection key={selectedTeam.id} teamId={selectedTeam.id} getToken={getToken} />
          )}
          {detailTab === 'coaches' && (
            <CoachesSection key={selectedTeam.id} teamId={selectedTeam.id} getToken={getToken} />
          )}
          {detailTab === 'players' && (
            <PlayersSection key={selectedTeam.id} teamId={selectedTeam.id} getToken={getToken} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Root page ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { getToken } = useAuth()
  const { isSignedIn, isLoaded } = useUser()
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { navigate('/sign-in'); return }
  }, [isLoaded, isSignedIn, navigate])

  const tabs = ['users', 'teams']

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        {/* Top-level tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm capitalize font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab getToken={getToken} />}
        {tab === 'teams' && <TeamsTab getToken={getToken} />}
      </main>
    </div>
  )
}
