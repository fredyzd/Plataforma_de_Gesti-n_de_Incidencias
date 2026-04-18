import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import clsx from 'clsx'

const ENV = import.meta.env.VITE_APP_ENV ?? 'qas'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.passwordChangeRequired) {
        navigate('/change-initial-password', { state: { tempToken: result.tempToken } })
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al iniciar sesión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-wide">PGI</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white leading-snug">
            Plataforma de<br />Gestión de<br />Incidencias
          </h2>
          <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-sm">
            Registra, gestiona y resuelve incidencias con trazabilidad completa, SLA automático y notificaciones en tiempo real.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {['SLA automático', 'Tiempo real', 'Historial completo', 'Multi-rol'].map((tag) => (
              <span key={tag} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-full border border-slate-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-xs">© 2026 PGI — Uso interno</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-base">PGI</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Bienvenido</h1>
            <p className="text-slate-500 text-sm mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Env badge */}
          <div className="mb-6">
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
                ENV === 'production'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full', ENV === 'production' ? 'bg-emerald-500' : 'bg-amber-500')} />
              {ENV === 'production' ? 'Producción' : 'QAS / Pruebas'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                placeholder="usuario@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-11 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-3 rounded-xl">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm"
            >
              {loading ? <Spinner className="h-4 w-4 text-white" /> : null}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <a href="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
