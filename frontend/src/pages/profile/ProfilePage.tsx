import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { ContentLoader, Spinner } from '../../components/ui/Spinner'
import {
  User,
  Mail,
  Shield,
  Building2,
  Phone,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import clsx from 'clsx'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agent: 'Agente',
  reporter: 'Reporter',
}

interface ProfileData {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  department: string | null
  phone: string | null
  active: boolean
  lastLogin: string | null
  createdAt: string
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-slate-500">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user: me } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Change password form
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [changingPass, setChangingPass] = useState(false)
  const [passResult, setPassResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    api.get<ProfileData>('/auth/me')
      .then((r) => setProfile(r.data))
      .finally(() => setLoading(false))
  }, [])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassResult(null)
    if (newPass !== confirmPass) {
      setPassResult({ ok: false, msg: 'Las contraseñas no coinciden' })
      return
    }
    if (newPass.length < 8) {
      setPassResult({ ok: false, msg: 'La contraseña debe tener al menos 8 caracteres' })
      return
    }
    setChangingPass(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPass,
        new_password: newPass,
      })
      setPassResult({ ok: true, msg: 'Contraseña actualizada correctamente' })
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al cambiar la contraseña'
      setPassResult({ ok: false, msg })
    } finally {
      setChangingPass(false)
    }
  }

  if (loading) return <AppShell><ContentLoader /></AppShell>

  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join('').toUpperCase()

  return (
    <AppShell>
      <PageHeader title="Mi perfil" subtitle="Información de tu cuenta" />

      <div className="p-6 max-w-2xl space-y-6">
        {/* Avatar + name header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{profile?.email}</p>
            <span className={clsx(
              'inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold border',
              me?.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200'
                : me?.role === 'supervisor' ? 'bg-purple-50 text-purple-700 border-purple-200'
                : me?.role === 'agent' ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}>
              <Shield size={11} />
              {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role}
            </span>
          </div>
        </div>

        {/* Info detalle */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pt-4 pb-1">Información de cuenta</h3>
          <InfoRow icon={<Mail size={15} />} label="Correo electrónico" value={profile?.email} />
          <InfoRow icon={<User size={15} />} label="Nombre completo" value={`${profile?.first_name} ${profile?.last_name}`} />
          <InfoRow
            icon={<Building2 size={15} />}
            label="Departamento"
            value={profile?.department ?? <span className="text-slate-400 font-normal">No asignado</span>}
          />
          <InfoRow
            icon={<Phone size={15} />}
            label="Teléfono"
            value={profile?.phone ?? <span className="text-slate-400 font-normal">No registrado</span>}
          />
          <InfoRow
            icon={<Calendar size={15} />}
            label="Último acceso"
            value={
              profile?.lastLogin
                ? new Date(profile.lastLogin).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : <span className="text-slate-400 font-normal">Sin registro</span>
            }
          />
          <InfoRow
            icon={<Calendar size={15} />}
            label="Cuenta creada"
            value={
              profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
                : '—'
            }
          />
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Lock size={15} className="text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Cambiar contraseña</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contraseña actual</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Tu contraseña actual"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Mínimo 8 caracteres"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirmar nueva contraseña</label>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className={clsx(
                  'w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400',
                  confirmPass && confirmPass !== newPass
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200'
                )}
                placeholder="Repite la nueva contraseña"
              />
              {confirmPass && confirmPass !== newPass && (
                <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            {passResult && (
              <div className={clsx(
                'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm',
                passResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              )}>
                {passResult.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {passResult.msg}
              </div>
            )}

            <button
              type="submit"
              disabled={changingPass || (!!confirmPass && confirmPass !== newPass)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              {changingPass && <Spinner className="h-4 w-4 text-white" />}
              {changingPass ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
