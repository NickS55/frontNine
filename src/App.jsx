import { FloatingEquipment } from './components/FloatingEquipment'
import { RotatingText } from './components/RotatingText'
import './App.css'

export default function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" width="22" height="22">
                <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" />
                <path strokeLinecap="round" strokeWidth="2" stroke="currentColor"
                  d="m51.04508,2.69672a48,48 0 0 1 0,96m-30,-73c10,8 20.20713,10.1496 30.20713,10.1496s19.79287,-2.1496 29.79287,-10.1496m-60,50c10,-8 19.58573,-11.3924 29.58573,-11.3924s20.41427,3.3924 30.41427,11.3924" />
              </svg>
            </div>
            <span className="text-xl font-bold text-foreground">frontNine</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 py-20 md:py-32 lg:py-40">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Tools to
            <br />
            <RotatingText
              phrases={[
                'Stay Healthy',
                'Throw Harder',
                'Throw Strikes',
                'Hit Harder',
                'Get Drafted',
                'Make More Plays',
              ]}
            />
          </h1>

          <p className="mb-10 mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Track the metrics that matter... weight, grip strength, velocity, and rotation measurements.
            Monitor your progress over time and join our community to decide what metrics to track next.
          </p>

          <button
            className="w-36 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 cursor-pointer"
            onClick={() => window.location.href = '/lineup'}
          >
            Start
          </button>
        </div>
      </section>
    </div>
  )
}
