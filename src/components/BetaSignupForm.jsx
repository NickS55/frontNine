import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'

export function BetaSignupForm() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    role: '',
    level: '',
    teamName: '',
    rosterSize: '',
    technology: [],
    name: '',
    email: '',
    phone: '',
    source: '',
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const toggleTech = (tech) => setForm(prev => ({
    ...prev,
    technology: prev.technology.includes(tech)
      ? prev.technology.filter(t => t !== tech)
      : [...prev.technology, tech],
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/beta-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-primary/40 bg-card p-10 text-center"
        style={{ animation: 'fadeInUp 0.4s ease both' }}
      >
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <h3 className="font-display mb-2 text-4xl font-bold uppercase text-primary">Application Received</h3>
        <p className="text-muted-foreground leading-relaxed">
          Thanks, {form.name.split(' ')[0]}. We&apos;ll review your application
          and reach out if you&apos;re selected as a Founding Member.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
      <div className="flex h-1 bg-border/20">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className="flex-1 transition-all duration-500"
            style={{ background: s <= step ? 'var(--primary)' : 'transparent' }}
          />
        ))}
      </div>

      <div className="p-8">
        {step === 1 && (
          <Step1 key={1} form={form} update={update} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <Step2 key={2} form={form} update={update} toggleTech={toggleTech} onBack={() => setStep(1)} onNext={() => setStep(3)} />
        )}
        {step === 3 && (
          <Step3 key={3} form={form} update={update} onBack={() => setStep(2)} onSubmit={handleSubmit} loading={loading} error={error} />
        )}
      </div>
    </div>
  )
}

function Step1({ form, update, onNext }) {
  const roles = [
    { value: 'coach', label: 'Coach', desc: 'I run a program and develop players' },
    { value: 'player', label: 'Player', desc: "I'm working to improve my own game" },
    { value: 'parent', label: 'Parent', desc: 'I support a player in the program' },
  ]

  return (
    <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
      <p className="mb-1.5 text-xs font-bold tracking-widest text-primary/60">STEP 1 OF 3</p>
      <h3 className="font-display mb-6 text-3xl font-bold uppercase">Who Are You?</h3>
      <div className="mb-8 grid gap-3">
        {roles.map(role => (
          <button
            key={role.value}
            onClick={() => update('role', role.value)}
            className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 text-left transition-all ${
              form.role === role.value
                ? 'border-primary bg-primary/10'
                : 'border-border/50 hover:border-border/80'
            }`}
          >
            <div
              className={`h-4 w-4 flex-shrink-0 rounded-full border-2 transition-all ${
                form.role === role.value ? 'border-primary bg-primary' : 'border-muted-foreground'
              }`}
            />
            <div>
              <div className="font-semibold">{role.label}</div>
              <div className="text-sm text-muted-foreground">{role.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={!form.role}
        className="w-full cursor-pointer rounded-lg bg-primary px-6 py-3.5 font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Continue →
      </button>
    </div>
  )
}

function Step2({ form, update, toggleTech, onBack, onNext }) {
  const levels = ['High School', 'Competitive Middle School', 'Travel Ball', 'College']
  const techs = ['Trackman', 'Rapsodo', 'FlightScope', 'HitTrax', 'None']

  return (
    <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
      <p className="mb-1.5 text-xs font-bold tracking-widest text-primary/60">STEP 2 OF 3</p>
      <h3 className="font-display mb-6 text-3xl font-bold uppercase">Your Setup</h3>

      <div className="mb-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold">Level</label>
          <div className="grid grid-cols-2 gap-2">
            {levels.map(level => (
              <button
                key={level}
                onClick={() => update('level', level)}
                className={`cursor-pointer rounded-lg border p-2.5 text-sm font-medium transition-all ${
                  form.level === level
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/50 text-muted-foreground hover:border-border/80 hover:text-foreground'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Team / School Name</label>
          <input
            type="text"
            value={form.teamName}
            onChange={e => update('teamName', e.target.value)}
            placeholder="e.g. Lincoln Mustangs"
            className="w-full rounded-lg border border-border/50 bg-input px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Approximate Roster Size</label>
          <input
            type="number"
            value={form.rosterSize}
            onChange={e => update('rosterSize', e.target.value)}
            placeholder="e.g. 18"
            min="1"
            max="200"
            className="w-full rounded-lg border border-border/50 bg-input px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Tracking Technology</label>
          <p className="mb-3 text-xs text-muted-foreground">Select all that apply</p>
          <div className="flex flex-wrap gap-2">
            {techs.map(tech => (
              <button
                key={tech}
                onClick={() => toggleTech(tech)}
                className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                  form.technology.includes(tech)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/50 text-muted-foreground hover:border-border/80'
                }`}
              >
                {tech}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="cursor-pointer rounded-lg border border-border/50 px-5 py-3.5 text-sm font-semibold transition-all hover:border-border/80"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!form.level}
          className="flex-1 cursor-pointer rounded-lg bg-primary px-6 py-3.5 font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

function Step3({ form, update, onBack, onSubmit, loading, error }) {
  const sources = ['Word of mouth', 'Social media', 'Google search', 'Coach referral', 'Player referral', 'Other']
  const isValid = form.name.trim() && form.email.trim() && form.email.includes('@')

  return (
    <form onSubmit={onSubmit} style={{ animation: 'fadeInUp 0.3s ease both' }}>
      <p className="mb-1.5 text-xs font-bold tracking-widest text-primary/60">STEP 3 OF 3</p>
      <h3 className="font-display mb-6 text-3xl font-bold uppercase">Contact Info</h3>

      <div className="mb-8 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold">Your Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Full name"
            required
            className="w-full rounded-lg border border-border/50 bg-input px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-lg border border-border/50 bg-input px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Phone Number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => update('phone', e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full rounded-lg border border-border/50 bg-input px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">How did you hear about us?</label>
          <div className="flex flex-wrap gap-2">
            {sources.map(src => (
              <button
                key={src}
                type="button"
                onClick={() => update('source', src)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  form.source === src
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/50 text-muted-foreground hover:border-border/80'
                }`}
              >
                {src}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer rounded-lg border border-border/50 px-5 py-3.5 text-sm font-semibold transition-all hover:border-border/80"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={!isValid || loading}
          className="flex-1 cursor-pointer rounded-lg bg-primary px-6 py-3.5 font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {loading ? 'Submitting...' : 'Submit Application →'}
        </button>
      </div>
    </form>
  )
}
