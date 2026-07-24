import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { FloatingEquipment } from './components/FloatingEquipment'
import { Header } from './components/Header'
import { BetaSignupForm } from './components/BetaSignupForm'
import trackmanLogo from './assets/logos/trackman.svg'
import gamechangerLogo from './assets/logos/gamechanger.svg'
import pitchsmartLogo from './assets/logos/pitchsmart.png'
import rapsodoLogo from './assets/logos/rapsodo.svg'

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
          className="font-display mb-6 max-w-full text-[clamp(1.25rem,calc(8.1vw_-_3.9px),6rem)] font-extrabold uppercase leading-none tracking-tight whitespace-nowrap"
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
          All Nine Sports gives high school and travel ball coaches one platform
          to develop pitchers: track every bullpen with just a phone, keep every
          arm healthy, and show every pitcher exactly how they&apos;re improving,
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
              Everything Your Pitching Staff Needs
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <FeatureCard
              label="BULLPEN TRACKING"
              title="Every Rep, Recorded"
              description="Capture bullpens with just a phone. No extra hardware. Pitch location, velocity, and an objective command score for every session, charted across the season. TrackMan data drops right in too."
              cta="In Beta Now"
              live={false}
              icon={<BullpenIcon />}
            />
            <FeatureCard
              label="ARM CARE"
              title="Protect Every Arm"
              description="Daily soreness and readiness check-ins, workload tracked across bullpens and game outings, and Pitch Smart alerts that flag when a pitcher needs rest before it becomes an injury."
              cta="In Beta Now"
              live={false}
              icon={<ShieldIcon />}
            />
            <FeatureCard
              label="COACH DASHBOARD"
              title="Run the Whole Staff"
              description="Workload and readiness across your entire roster at a glance. Assign training work with automatic completion tracking, and drill into any pitcher's full development history."
              cta="In Beta Now"
              live={false}
              icon={<StatsIcon />}
            />
            <FeatureCard
              label="COMPARE TO THE BEST"
              title="MLB Comparison Tool"
              description="Enter your pitch data. See which MLB pitcher you compare to. Free."
              cta="Try It Now →"
              href="/pitch-dna"
              live
              icon={<MlbIcon />}
            />
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="relative z-10 px-6 py-14">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-8 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Integrates With
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
            <img
              src={trackmanLogo}
              alt="TrackMan"
              className="h-5 w-auto brightness-0 invert opacity-50 transition-opacity duration-200 hover:opacity-90"
            />
            <img
              src={gamechangerLogo}
              alt="GameChanger"
              className="h-4 w-auto brightness-0 invert opacity-50 transition-opacity duration-200 hover:opacity-90"
            />
            <img
              src={pitchsmartLogo}
              alt="MLB Pitch Smart"
              className="h-12 w-auto brightness-0 invert opacity-50 transition-opacity duration-200 hover:opacity-90"
            />
            <img
              src={rapsodoLogo}
              alt="Rapsodo"
              className="h-7 w-auto brightness-0 invert opacity-50 transition-opacity duration-200 hover:opacity-90"
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

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
      <polyline points="8 12 10.5 12 12 9.5 13.5 14 15 12 16 12" />
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
