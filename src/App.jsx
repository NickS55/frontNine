import { Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import SignInPage from './SignInPage'
import HomePage from './HomePage'
import OnboardingPage from './OnboardingPage'
import AdminPage from './AdminPage'
import BullpenSessionPage from './BullpenSessionPage'
import PitchDnaPage from './PitchDnaPage'
import InvitePage from './InvitePage'
import CoachPlayerPage from './CoachPlayerPage'
import TrackingSessionPage from './TrackingSessionPage'
import NotFoundPage from './NotFoundPage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/bullpen/:sessionId" element={<BullpenSessionPage />} />
      <Route path="/pitch-dna" element={<PitchDnaPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/coach/player/:profileId" element={<CoachPlayerPage />} />
      <Route path="/tracking-uploads/:uploadId" element={<TrackingSessionPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
