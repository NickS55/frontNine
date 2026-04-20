import { useEffect, useState, useMemo } from 'react'
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

export default function AdminPage() {
  const { getToken } = useAuth()
  const { isSignedIn, isLoaded } = useUser()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sorting, setSorting] = useState([])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      navigate('/sign-in')
      return
    }

    async function fetchUsers() {
      try {
        const token = await getToken()
        const res = await fetch(`${BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 403) {
          setError('Access denied — admins only.')
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setUsers(await res.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [isLoaded, isSignedIn, getToken, navigate])

  async function updateRole(userId, newRole) {
    const token = await getToken()
    const res = await fetch(`${BASE_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isAdmin }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
  }

  const columns = useMemo(
    () => [
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
        cell: info =>
          new Date(info.getValue()).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
      }),
      columnHelper.accessor('id', {
        header: 'ID',
        cell: info => (
          <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>
        ),
        enableSorting: false,
      }),
    ],
    []
  )

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold">Users</h1>

        {loading && (
          <p className="text-muted-foreground">Loading…</p>
        )}

        {error && (
          <p className="text-destructive">{error}</p>
        )}

        {!loading && !error && (
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
            <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              {users.length} user{users.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
