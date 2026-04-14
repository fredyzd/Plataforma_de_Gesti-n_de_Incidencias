import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { GlobalSocketListener } from './components/GlobalSocketListener'

import LoginPage from './pages/auth/LoginPage'
import ChangeInitialPasswordPage from './pages/auth/ChangeInitialPasswordPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import DashboardPage from './pages/incidents/DashboardPage'
import IncidentListPage from './pages/incidents/IncidentListPage'
import CreateIncidentPage from './pages/incidents/CreateIncidentPage'
import IncidentDetailPage from './pages/incidents/IncidentDetailPage'
import ReportsPage from './pages/reports/ReportsPage'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <GlobalSocketListener />
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/change-initial-password" element={<ChangeInitialPasswordPage />} />

            {/* App */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute><IncidentListPage /></ProtectedRoute>} />
            <Route path="/incidents/new" element={<ProtectedRoute><CreateIncidentPage /></ProtectedRoute>} />
            <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetailPage /></ProtectedRoute>} />
            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={['agent', 'supervisor', 'admin']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
