import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Header } from './components/Header'
import { FloatingEquipment } from './components/FloatingEquipment'

const BASE_URL = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'

const POSITIONS = [
  { value: 'pitcher',           label: 'P',  name: 'Pitcher'  },
  { value: 'catcher',           label: 'C',  name: 'Catcher'  },
  { value: 'first_base',        label: '1B', name: '1st Base' },
  { value: 'second_base',       label: '2B', name: '2nd Base' },
  { value: 'third_base',        label: '3B', name: '3rd Base' },
  { value: 'shortstop',         label: 'SS', name: 'Shortstop'},
  { value: 'left_field',        label: 'LF', name: 'Left'     },
  { value: 'center_field',      label: 'CF', name: 'Center'   },
  { value: 'right_field',       label: 'RF', name: 'Right'    },
  { value: 'designated_hitter', label: 'DH', name: 'DH'       },
]

const inputCls = "w-full rounded-lg border border-border/50 bg-input px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
const labelCls = "block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5"

export function roleKey(userId) {
  return `backNine_role_${userId}`
}

function profileDoneKey(userId) {
  return `backNine_profile_done_${userId}`
}

export default function OnboardingPage() {
  const { getToken } = useAuth()
  const { isSignedIn, isLoaded, user } = useUser()
  const navigate = useNavigate()
  const [step, setStep] = useState(null)
  const [role, setRole] = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { navigate('/sign-in'); return }

    const savedRole = localStorage.getItem(roleKey(user.id))
    const profileDone = localStorage.getItem(profileDoneKey(user.id))

    if (savedRole === 'coach') {
      if (profileDone) { navigate('/home'); return }
      setRole('coach')
      setStep(2)
      return
    }
    if (savedRole === 'player') { setRole('player'); setStep(2); return }
    setStep(1)
  }, [isLoaded, isSignedIn, user, navigate])

  function markDoneAndGo() {
    localStorage.setItem(profileDoneKey(user.id), 'true')
    navigate('/home')
  }

  if (step === null) return null

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      <main className="relative z-10 flex min-h-[calc(100vh-64px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
            <div className="flex h-1 bg-border/20">
              {[1, 2].map(s => (
                <div
                  key={s}
                  className="flex-1 transition-all duration-500"
                  style={{ background: s <= step ? 'var(--primary)' : 'transparent' }}
                />
              ))}
            </div>

            <div className="p-8">
              {step === 1 && (
                <RoleStep
                  getToken={getToken}
                  userId={user.id}
                  onCoach={() => { setRole('coach'); setStep(2) }}
                  onPlayer={() => { setRole('player'); setStep(2) }}
                />
              )}
              {step === 2 && role === 'player' && (
                <ProfileStep
                  getToken={getToken}
                  onDone={markDoneAndGo}
                  onSkip={markDoneAndGo}
                />
              )}
              {step === 2 && role === 'coach' && (
                <CoachProfileStep
                  getToken={getToken}
                  onDone={markDoneAndGo}
                  onSkip={markDoneAndGo}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function RoleStep({ getToken, userId, onCoach, onPlayer }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function choose(role) {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/users/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      localStorage.setItem(roleKey(userId), role)
      if (role === 'coach') onCoach()
      else onPlayer()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ animation: 'fadeInUp 0.35s ease both' }}>
      <p className="mb-2 text-xs font-bold tracking-widest text-primary/60">STEP 1 OF 2</p>
      <h2 className="font-display mb-2 text-4xl font-bold uppercase leading-none">
        Welcome to<br /><span className="text-primary">backNine</span>
      </h2>
      <p className="mb-8 text-muted-foreground">How will you be using the app?</p>

      <div className="mb-6 space-y-3">
        {[
          { role: 'player', emoji: '⚾', title: "I'm a Player", desc: 'Track your own pitch sessions and stats' },
          { role: 'coach',  emoji: '📋', title: "I'm a Coach",  desc: 'Manage and develop your players' },
        ].map(({ role, emoji, title, desc }) => (
          <button
            key={role}
            onClick={() => choose(role)}
            disabled={loading}
            className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border/50 bg-background/40 p-5 text-left transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
              {emoji}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{title}</div>
              <div className="text-sm text-muted-foreground">{desc}</div>
            </div>
            <svg className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-sm text-muted-foreground">Setting up your account…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function CoachProfileStep({ getToken, onDone, onSkip }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', homeCity: '', bio: '' })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const canSave = form.firstName.trim().length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSave || loading) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const name = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ')
      const res = await fetch(`${BASE_URL}/coach-profiles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          homeCity: form.homeCity.trim() || null,
          bio: form.bio.trim() || null,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onDone()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ animation: 'fadeInUp 0.35s ease both' }}>
      <p className="mb-2 text-xs font-bold tracking-widest text-primary/60">STEP 2 OF 2</p>
      <h2 className="font-display mb-2 text-4xl font-bold uppercase leading-none">Your Profile</h2>
      <p className="mb-8 text-muted-foreground">Only your first name is required. Everything else is optional.</p>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>First Name *</label>
            <input
              type="text"
              value={form.firstName}
              onChange={e => update('firstName', e.target.value)}
              placeholder="Nick"
              autoComplete="given-name"
              autoCorrect="off"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Last Name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={e => update('lastName', e.target.value)}
              placeholder="Sadd"
              autoComplete="family-name"
              autoCorrect="off"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => update('phone', e.target.value)}
            placeholder="+1 (555) 000-0000"
            autoComplete="tel"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Home City</label>
          <input
            type="text"
            value={form.homeCity}
            onChange={e => update('homeCity', e.target.value)}
            placeholder="Boston, MA"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Bio</label>
          <textarea
            value={form.bio}
            onChange={e => update('bio', e.target.value)}
            placeholder="Tell players a bit about yourself…"
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={!canSave || loading}
        className="mt-8 w-full cursor-pointer rounded-lg bg-primary px-6 py-3.5 font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {loading ? 'Creating Profile…' : 'Create Profile →'}
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="mt-3 w-full cursor-pointer rounded-lg px-6 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Skip for now
      </button>
    </form>
  )
}

function ProfileStep({ getToken, onDone, onSkip }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [useImperial, setUseImperial] = useState(true)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    handedness: '',
    heightFt: '',
    heightIn: '',
    heightCm: '',
    weightLbs: '',
    weightKg: '',
    positions: [],
    phone: '',
    email: '',
    homeCity: '',
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const togglePosition = (pos) => setForm(prev => ({
    ...prev,
    positions: prev.positions.includes(pos)
      ? prev.positions.filter(p => p !== pos)
      : [...prev.positions, pos],
  }))

  const canSave = form.firstName.trim().length > 0

  const today = new Date().toISOString().split('T')[0]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSave || loading) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()

      const name = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ')

      let heightCm = null
      if (useImperial && form.heightFt) {
        const ft = parseFloat(form.heightFt)
        const inch = parseFloat(form.heightIn) || 0
        if (!isNaN(ft) && ft > 0) heightCm = (ft * 12 + inch) * 2.54
      } else if (!useImperial && form.heightCm) {
        const cm = parseFloat(form.heightCm)
        if (!isNaN(cm) && cm > 0) heightCm = cm
      }

      let weightKg = null
      if (useImperial && form.weightLbs) {
        const lbs = parseFloat(form.weightLbs)
        if (!isNaN(lbs) && lbs > 0) weightKg = lbs / 2.20462
      } else if (!useImperial && form.weightKg) {
        const kg = parseFloat(form.weightKg)
        if (!isNaN(kg) && kg > 0) weightKg = kg
      }

      const body = {
        name,
        dateOfBirth: form.dateOfBirth || null,
        handedness: form.handedness || null,
        heightCm,
        weightKg,
        positions: form.positions.length > 0 ? form.positions : null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        homeCity: form.homeCity.trim() || null,
      }

      const res = await fetch(`${BASE_URL}/players`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onDone()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ animation: 'fadeInUp 0.35s ease both' }}>
      <p className="mb-2 text-xs font-bold tracking-widest text-primary/60">STEP 2 OF 2</p>
      <h2 className="font-display mb-2 text-4xl font-bold uppercase leading-none">Your Profile</h2>
      <p className="mb-8 text-muted-foreground">Only your first name is required. Everything else is optional.</p>

      <div className="space-y-7">
        {/* Identity */}
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Identity</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First Name *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => update('firstName', e.target.value)}
                placeholder="Nick"
                autoComplete="given-name"
                autoCorrect="off"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => update('lastName', e.target.value)}
                placeholder="Sadd"
                autoComplete="family-name"
                autoCorrect="off"
                className={inputCls}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelCls}>Date of Birth</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={e => update('dateOfBirth', e.target.value)}
              max={today}
              className={inputCls}
            />
          </div>
        </section>

        {/* Physical */}
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Physical</p>

          <div className="mb-3">
            <label className={labelCls}>Handedness</label>
            <div className="flex gap-2">
              {['left', 'right', 'switch'].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => update('handedness', form.handedness === h ? '' : h)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-all ${
                    form.handedness === h
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 text-muted-foreground hover:border-border/80 hover:text-foreground'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between rounded-lg border border-border/50 bg-input px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Use Imperial (ft / lbs)</span>
            <button
              type="button"
              onClick={() => setUseImperial(p => !p)}
              className={`relative h-6 w-11 rounded-full transition-colors ${useImperial ? 'bg-primary' : 'bg-border'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${useImperial ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Height</label>
              {useImperial ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.heightFt}
                    onChange={e => update('heightFt', e.target.value)}
                    placeholder="ft"
                    min="0"
                    max="8"
                    className={inputCls}
                  />
                  <input
                    type="number"
                    value={form.heightIn}
                    onChange={e => update('heightIn', e.target.value)}
                    placeholder="in"
                    min="0"
                    max="11"
                    className={inputCls}
                  />
                </div>
              ) : (
                <input
                  type="number"
                  value={form.heightCm}
                  onChange={e => update('heightCm', e.target.value)}
                  placeholder="cm"
                  min="0"
                  className={inputCls}
                />
              )}
            </div>
            <div>
              <label className={labelCls}>Weight</label>
              <input
                type="number"
                value={useImperial ? form.weightLbs : form.weightKg}
                onChange={e => update(useImperial ? 'weightLbs' : 'weightKg', e.target.value)}
                placeholder={useImperial ? 'lbs' : 'kg'}
                min="0"
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {/* Positions */}
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Positions</p>
          <div className="grid grid-cols-5 gap-2">
            {POSITIONS.map(pos => (
              <button
                key={pos.value}
                type="button"
                onClick={() => togglePosition(pos.value)}
                className={`flex flex-col items-center rounded-lg border px-2 py-2.5 transition-all ${
                  form.positions.includes(pos.value)
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border/50 text-muted-foreground hover:border-border/80 hover:text-foreground'
                }`}
              >
                <span className="text-sm font-bold">{pos.label}</span>
                <span className="text-[10px] font-normal opacity-70">{pos.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact & Location</p>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
                autoComplete="tel"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Home City</label>
              <input
                type="text"
                value={form.homeCity}
                onChange={e => update('homeCity', e.target.value)}
                placeholder="Boston, MA"
                className={inputCls}
              />
            </div>
          </div>
        </section>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={!canSave || loading}
        className="mt-8 w-full cursor-pointer rounded-lg bg-primary px-6 py-3.5 font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {loading ? 'Creating Profile…' : 'Create Profile →'}
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="mt-3 w-full cursor-pointer rounded-lg px-6 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Skip for now
      </button>
    </form>
  )
}
