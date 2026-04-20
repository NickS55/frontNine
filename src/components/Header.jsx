import { useUser, UserButton } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

export function Header() {
  const { isSignedIn, user } = useUser()
  const navigate = useNavigate()

  return (
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

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <span className="hidden sm:block text-sm text-muted-foreground">
                {user.firstName ?? user.primaryEmailAddress?.emailAddress}
              </span>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <button
              onClick={() => navigate('/sign-in')}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
