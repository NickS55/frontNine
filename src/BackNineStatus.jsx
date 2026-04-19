import { useState, useEffect } from 'react'

const BASE_URL = 'https://backnine-production-eb29.up.railway.app'

async function checkEndpoint(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export default function BackNineStatus() {
  const [api, setApi] = useState(null)
  const [db, setDb] = useState(null)

  useEffect(() => {
    checkEndpoint('/')
      .then(data => setApi({ ok: true, message: data.message }))
      .catch(err => setApi({ ok: false, message: err.message }))

    checkEndpoint('/health/db')
      .then(data => setDb({ ok: data.db === 'connected', message: data.db }))
      .catch(err => setDb({ ok: false, message: err.message }))
  }, [])

  const dot = ok => (
    <span style={{ color: ok ? 'limegreen' : 'tomato', marginRight: 6 }}>●</span>
  )

  const row = (label, state) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {state ? dot(state.ok) : <span style={{ marginRight: 6 }}>○</span>}
      <strong>{label}</strong>
      <span style={{ color: 'var(--text-2, #888)', fontSize: 13 }}>
        {state ? state.message : 'checking…'}
      </span>
    </div>
  )

  return (
    <div style={{
      border: '1px solid var(--border, #333)',
      borderRadius: 8,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      fontSize: 14,
      textAlign: 'left',
      minWidth: 260,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>backNine status</div>
      {row('API', api)}
      {row('DB', db)}
    </div>
  )
}
