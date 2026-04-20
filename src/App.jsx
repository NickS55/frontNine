import { Routes, Route, useNavigate } from 'react-router-dom'
import { FloatingEquipment } from './components/FloatingEquipment'
import { RotatingText } from './components/RotatingText'
import { Header } from './components/Header'
import SignInPage from './SignInPage'
import HomePage from './HomePage'
import AdminPage from './AdminPage'
import BullpenSessionPage from './BullpenSessionPage'
import './App.css'

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      {/* Hero */}
      <section className="relative z-10 px-6 py-20 md:py-32 lg:py-40">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
            The Coaching
            <br />
            Platform for
            <br />
            <RotatingText
              phrases={[
                'Championship Teams',
                'Player Development',
                'Your Roster',
                'Your Program',
              ]}
            />
          </h1>

          <p className="mb-10 mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            All your players. All their data. One platform to develop your entire roster.
          </p>

          <button
            className="w-36 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 cursor-pointer"
            onClick={() => navigate('/sign-in')}
          >
            Start
          </button>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/bullpen/:sessionId" element={<BullpenSessionPage />} />
    </Routes>
  )
}
