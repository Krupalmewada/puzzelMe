import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import SetupPage from '../pages/SetupPage'
import ProcessingPage from '../pages/ProcessingPage'
import SolvingPage from '../pages/SolvingPage'
import CompletePage from '../pages/CompletePage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/processing" element={<ProcessingPage />} />
        <Route path="/solving" element={<SolvingPage />} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}