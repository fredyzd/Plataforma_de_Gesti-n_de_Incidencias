import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { Shield } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [devToken, setDevToken] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setSent(true)
      if (data.dev_reset_token) setDevToken(data.dev_reset_token)
    } catch {
      setError('Error al procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-3">
              <Shield size={24} className="text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Recuperar contraseña</h1>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-3 rounded-lg">
                Si el correo existe, recibirás un enlace de recuperación.
              </div>
              {devToken && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg">
                  <p className="font-bold mb-1">[QAS] Token de recuperación:</p>
                  <code className="break-all">{devToken}</code>
                </div>
              )}
              <Link
                to="/login"
                className="block text-center text-sm text-blue-600 hover:underline"
              >
                Volver al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="usuario@empresa.com"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading && <Spinner className="h-4 w-4 text-white" />}
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
              <Link to="/login" className="block text-center text-xs text-gray-500 hover:underline">
                Volver al login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
