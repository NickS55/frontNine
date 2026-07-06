import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useNavigate, useParams } from 'react-router-dom'
import { FloatingEquipment } from './components/FloatingEquipment'

const BASE_URL = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'
export const PENDING_INVITE_KEY = 'pending_invite_token'

export default function InvitePage() {
  const { token } = useParams()
  const { isSignedIn, isLoaded } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // 'loading' | 'accepting' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      localStorage.setItem(PENDING_INVITE_KEY, token)
      navigate('/sign-in')
      return
    }

    async function accept() {
      setStatus('accepting')
      try {
        const authToken = await getToken()
        const res = await fetch(`${BASE_URL}/teams/invite/${token}/accept`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        })
        const data = await res.json()

        if (res.status === 400) {
          // No player profile yet — save token and redirect to onboarding
          localStorage.setItem(PENDING_INVITE_KEY, token)
          navigate('/onboarding')
          return
        }
        if (!res.ok) {
          setStatus('error')
          setErrorMsg(data.error ?? `HTTP ${res.status}`)
          return
        }
        localStorage.removeItem(PENDING_INVITE_KEY)
        setStatus('success')
        setTimeout(() => navigate('/home'), 1500)
      } catch {
        setStatus('error')
        setErrorMsg('Something went wrong. Please try again.')
      }
    }

    accept()
  }, [isLoaded, isSignedIn, token, getToken, navigate])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <div className="relative z-10 mx-auto max-w-sm px-6 text-center">
        {(status === 'loading' || status === 'accepting') && (
          <>
            <div className="mb-4 text-4xl font-bold">⚾</div>
            <p className="text-lg font-semibold">Accepting your invite…</p>
            <p className="mt-2 text-sm text-muted-foreground">Hang tight.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mb-4 text-4xl font-bold">✓</div>
            <p className="text-lg font-semibold">You're on the team!</p>
            <p className="mt-2 text-sm text-muted-foreground">Redirecting to your dashboard…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-lg font-semibold text-destructive">Something went wrong</p>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
            <button
              onClick={() => navigate('/home')}
              className="mt-6 cursor-pointer rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  )
}
