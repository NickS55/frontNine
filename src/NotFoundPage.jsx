import { useNavigate } from 'react-router-dom'
import { Header } from './components/Header'
import { FloatingEquipment } from './components/FloatingEquipment'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-32 text-center">
        <p className="text-8xl font-black tabular-nums text-muted-foreground/20 select-none">404</p>
        <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">That URL doesn't exist.</p>
        <button
          onClick={() => navigate('/home')}
          className="mt-8 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Go home
        </button>
      </main>
    </div>
  )
}
