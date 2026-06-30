import { useUser, UserButton } from '@clerk/clerk-react'
import { useNavigate, Link } from 'react-router-dom'
import { Logo } from './Logo'

export function Header() {
  const { isSignedIn, user } = useUser()
  const navigate = useNavigate()

  return (
    <header className="relative z-10 bg-background/95 backdrop-blur-sm shadow-[0_1px_0_0_oklch(0.83_0.17_86_/_0.35)]">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <Logo className="h-9 w-auto text-primary" />
          <span className="font-display text-xl font-bold tracking-wide text-foreground uppercase">
            All Nine Sports
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-6">
          <Link to="/pitch-dna" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            MLB Comp
          </Link>
        </nav>

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
              className="rounded-lg border border-border/60 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
