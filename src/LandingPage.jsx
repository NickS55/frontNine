import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { FloatingEquipment } from './components/FloatingEquipment'
import { Header } from './components/Header'
import { BetaSignupForm } from './components/BetaSignupForm'

export default function LandingPage() {
  const formRef = useRef(null)

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />

      {/* Beta announcement banner */}
      <div className="relative z-20 w-full bg-primary py-2.5 px-4 text-center">
        <span className="font-semibold text-primary-foreground text-sm mr-3">
          Limited spots available. Acceptance by application only.
        </span>
        <button
          onClick={scrollToForm}
          className="cursor-pointer rounded-md bg-primary-foreground px-3 py-1 text-xs font-bold text-primary transition-opacity hover:opacity-80"
        >
          Apply Now →
        </button>
      </div>

      <Header />

      {/* Hero */}
      <section className="relative z-10 flex min-h-[88vh] flex-col items-center justify-center px-6 py-20 text-center">
        {/* Radial glow behind hero */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, oklch(0.83 0.17 86 / 0.04) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 30% 70%, oklch(0.33 0.14 265 / 0.3) 0%, transparent 60%)',
          }}
        />

        <h1
          className="font-display mb-6 text-[clamp(3.5rem,12vw,9rem)] font-extrabold uppercase leading-none tracking-tight"
          style={{ animation: 'fadeInUp 0.55s 0.08s ease both', opacity: 0 }}
        >
          Track The Work.<br />
          Understand The Data.<br />
          <span className="text-primary">See The Progress.</span>
        </h1>

        <p
          className="mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl"
          style={{ animation: 'fadeInUp 0.55s 0.18s ease both', opacity: 0 }}
        >
          All Nine Sports gives all coaches one platform to run better practices,
          review games, and show every player exactly how they&apos;re improving,
          all season long.
        </p>

        <div
          className="flex flex-col items-center gap-4"
          style={{ animation: 'fadeInUp 0.55s 0.28s ease both', opacity: 0 }}
        >
          <button
            onClick={scrollToForm}
            className="cursor-pointer rounded-lg bg-primary px-10 py-4 font-display text-xl font-bold uppercase tracking-wide text-primary-foreground transition-all hover:scale-105 hover:shadow-[0_0_40px_oklch(0.83_0.17_86_/_0.25)]"
          >
            Apply for Beta Access
          </button>
          <span className="text-sm text-muted-foreground">
            Approval required · Limited spots · $10/mo billed annually
          </span>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 px-6 pb-10 pt-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
              Everything Your Program Needs
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <FeatureCard
              label="BULLPEN TRACKING"
              title="Every Rep, Recorded"
              description="Log bullpen sessions, map pitch location, and track velocity over weeks and months. Give every pitcher a data record that shows them exactly how they're developing."
              cta="Coming to Beta"
              live={false}
              icon={<BullpenIcon />}
            />
            <FeatureCard
              label="GAME TRACKING"
              title="Own Your Season"
              description="Record games, review stats inning by inning, and build a full picture of your team's performance over time. Real data for coaches, players, and parents."
              cta="Coming to Beta"
              live={false}
              icon={<StatsIcon />}
            />
            <FeatureCard
              label="FREE TOOL"
              title="See Your MLB Comp"
              description="Curious how your pitch metrics compare to the pros? Try our free tool. A fun way to introduce players to data-driven development before they dive in."
              cta="Try It Free →"
              href="/pitch-dna"
              live
              icon={<MlbIcon />}
            />
          </div>
        </div>
      </section>

      {/* Beta Signup */}
      <section ref={formRef} className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <h2 className="font-display mb-4 text-4xl font-bold uppercase tracking-wide md:text-5xl">
              Join the<br />
              <span className="text-primary">Founding Coaches</span>
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              We&apos;re hand-selecting a small group of serious coaches to become
              Founding Members. Spots are limited and acceptance is not guaranteed.
              We&apos;re looking for programs that are ready to use data to develop
              their players. Founding Members lock in at $10/month, billed annually.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              {['Locked-in Founding Member pricing', 'Talk directly with the team', 'Shape what gets built', 'High school & travel ball focus'].map(perk => (
                <span key={perk} className="flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground">
                  <span className="text-primary">✓</span> {perk}
                </span>
              ))}
            </div>
          </div>

          <BetaSignupForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 px-6 py-8 text-center text-sm text-muted-foreground">
        <p>© 2025 All Nine Sports · Built for the serious game.</p>
      </footer>
    </div>
  )
}

function FeatureCard({ label, title, description, cta, href, live, icon }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_50px_oklch(0.83_0.17_86_/_0.06)]">
      <div className="absolute inset-x-0 top-0 h-px bg-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>

      <p className="mb-1.5 text-xs font-bold tracking-widest text-primary/60">{label}</p>
      <h3 className="font-display mb-3 text-2xl font-bold uppercase">{title}</h3>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{description}</p>

      {live ? (
        <Link
          to={href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary no-underline transition-all hover:gap-2"
        >
          {cta}
        </Link>
      ) : (
        <span className="inline-flex items-center rounded-full border border-border/40 px-3 py-1 text-xs text-muted-foreground">
          {cta}
        </span>
      )}
    </div>
  )
}

function MlbIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8.5 8.5c1.5 1.5 3 2.5 3.5 3.5s2-2 3.5-3.5M8.5 15.5c1.5-1.5 2.5-3 3.5-3.5s2 2 3.5 3.5" />
    </svg>
  )
}

function BullpenIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="22" />
      <line x1="2" y1="12" x2="8" y2="12" />
      <line x1="16" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function StatsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 8 13 13 9 9 2 16" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}
