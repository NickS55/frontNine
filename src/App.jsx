import { Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import SignInPage from './SignInPage'
import HomePage from './HomePage'
import AdminPage from './AdminPage'
import BullpenSessionPage from './BullpenSessionPage'
import PitchDnaPage from './PitchDnaPage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/bullpen/:sessionId" element={<BullpenSessionPage />} />
      <Route path="/pitch-dna" element={<PitchDnaPage />} />
    </Routes>
  )
}
