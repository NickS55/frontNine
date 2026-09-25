import { useState } from 'react'
import { Header } from './components/Header'
import { FloatingEquipment } from './components/FloatingEquipment'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'

const TOPICS = [
  'Getting started',
  'Bullpen tracking',
  'TrackMan upload',
  'Arm care & workload',
  'Caliper (iOS)',
  'Billing',
  'Bug report',
  'Something else',
]

export default function SupportPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    topic: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const isValid =
    form.name.trim() && form.email.trim() && form.email.includes('@') && form.message.trim()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/support-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError("That didn't send. Try again, or email us directly at support@allninesports.com.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="font-display mb-4 text-4xl font-bold uppercase tracking-wide md:text-5xl">
            How Can We<br />
            <span className="text-primary">Help?</span>
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Questions about your account, a bullpen that didn&apos;t track right, or an
            idea for what we should build next. Send it over and we&apos;ll get back to
            you within one business day.
          </p>
        </div>

        {submitted ? (
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
            <h2 className="font-display mb-2 text-4xl font-bold uppercase text-primary">Message Sent</h2>
            <p className="leading-relaxed text-muted-foreground">
              Thanks, {form.name.trim().split(' ')[0]}. We&apos;ll reply to {form.email} within one
              business day.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-2xl border border-border/50 bg-card p-8"
          >
            <div className="mb-8 space-y-5">
              <div>
                <label htmlFor="support-name" className="mb-2 block text-sm font-semibold">Your Name *</label>
                <input
                  id="support-name"
                  type="text"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="e.g. Casey Rivera"
                  required
                  className="w-full rounded-lg border border-border/50 bg-input px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="support-email" className="mb-2 block text-sm font-semibold">Email *</label>
                <input
                  id="support-email"
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="e.g. coach@lincolnbaseball.org"
                  required
                  className="w-full rounded-lg border border-border/50 bg-input px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">What&apos;s this about?</label>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map(topic => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => update('topic', topic)}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        form.topic === topic
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="support-message" className="mb-2 block text-sm font-semibold">Message *</label>
                <textarea
                  id="support-message"
                  value={form.message}
                  onChange={e => update('message', e.target.value)}
                  placeholder="Tell us what's going on. If it's a bug, what were you doing when it happened?"
                  required
                  rows={6}
                  className="w-full resize-y rounded-lg border border-border/50 bg-input px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full cursor-pointer rounded-lg bg-primary px-6 py-3.5 font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {loading ? 'Sending...' : 'Send Message →'}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Prefer email? Reach us at{' '}
          <a href="mailto:support@allninesports.com" className="text-primary hover:underline">
            support@allninesports.com
          </a>
        </p>
      </main>
    </div>
  )
}
