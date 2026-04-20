import { SignIn } from '@clerk/clerk-react'
import { FloatingEquipment } from './components/FloatingEquipment'
import { Header } from './components/Header'

export default function SignInPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      <div className="relative z-10 flex items-center justify-center px-6 py-20">
        <SignIn
          routing="path"
          path="/sign-in"
          afterSignInUrl="/home"
          afterSignUpUrl="/home"
          appearance={{
            variables: {
              colorPrimary: 'oklch(0.45 0.15 145)',
              colorBackground: 'oklch(0.99 0.01 120)',
              colorText: 'oklch(0.25 0.02 60)',
              colorInputBackground: 'oklch(1 0 0)',
              colorInputText: 'oklch(0.25 0.02 60)',
              borderRadius: '0.625rem',
              fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            },
            elements: {
              card: 'shadow-lg border border-border/50',
              headerTitle: 'text-foreground font-bold',
              headerSubtitle: 'text-muted-foreground',
              formButtonPrimary: 'bg-primary hover:opacity-90 text-primary-foreground',
              footerActionLink: 'text-primary',
            },
          }}
        />
      </div>
    </div>
  )
}
