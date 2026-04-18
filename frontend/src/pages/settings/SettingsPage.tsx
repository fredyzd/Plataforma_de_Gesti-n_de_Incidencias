import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { ContentLoader, Spinner } from '../../components/ui/Spinner'
import {
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Server,
  Shield,
  Info,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import clsx from 'clsx'

const ENV = import.meta.env.VITE_APP_ENV ?? 'qas'

interface SmtpConfig {
  configured: boolean
  mode: 'smtp' | 'ethereal' | 'none'
  host: string | null
  port: number | null
  user: string | null
  from: string | null
  secure: boolean
  initialized: boolean
  logCount: number
}

function ConfigRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={clsx('text-sm font-medium text-slate-800', mono && 'font-mono text-xs bg-slate-100 px-2 py-0.5 rounded')}>
        {value}
      </span>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [smtp, setSmtp] = useState<SmtpConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const loadConfig = () =>
    api.get<SmtpConfig>('/notifications/config')
      .then((r) => setSmtp(r.data))
      .finally(() => setLoading(false))

  useEffect(() => {
    loadConfig()
    setTestEmail(user?.email ?? '')
  }, [user])

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setTestResult(null)
    try {
      await api.post('/notifications/test', { to: testEmail || undefined })
      setTestResult({ ok: true, msg: `Email de prueba enviado a ${testEmail || user?.email}` })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al enviar email de prueba'
      setTestResult({ ok: false, msg })
    } finally {
      setSending(false)
    }
  }

  if (loading) return <AppShell><ContentLoader /></AppShell>

  const modeLabel = smtp?.mode === 'smtp' ? 'SMTP real' : smtp?.mode === 'ethereal' ? 'Ethereal (QAS)' : 'Sin configurar'
  const modeColor = smtp?.mode === 'smtp' ? 'text-emerald-600' : smtp?.mode === 'ethereal' ? 'text-amber-600' : 'text-red-600'
  const modeBg   = smtp?.mode === 'smtp' ? 'bg-emerald-50 border-emerald-200' : smtp?.mode === 'ethereal' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  return (
    <AppShell>
      <PageHeader title="Configuración" subtitle="Ajustes del sistema y notificaciones" />

      <div className="p-6 space-y-6 max-w-3xl">

        {/* Sistema */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Server size={13} />
            Información del sistema
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5">
            <ConfigRow label="Entorno" value={
              <span className={clsx(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                ENV === 'production' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              )}>
                <span className={clsx('w-1.5 h-1.5 rounded-full', ENV === 'production' ? 'bg-emerald-500' : 'bg-amber-500')} />
                {ENV === 'production' ? 'Producción' : 'QAS / Pruebas'}
              </span>
            } />
            <ConfigRow label="Frontend URL" value={window.location.origin} mono />
            <ConfigRow label="Versión API" value="v1" mono />
          </div>
        </section>

        {/* SMTP */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Mail size={13} />
              Configuración SMTP
            </h2>
            <button
              onClick={() => { setLoading(true); loadConfig() }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={11} />
              Refrescar
            </button>
          </div>

          {/* Status banner */}
          <div className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border mb-4', modeBg)}>
            {smtp?.mode === 'smtp' && <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />}
            {smtp?.mode === 'ethereal' && <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />}
            {smtp?.mode === 'none' && <XCircle size={16} className="text-red-600 flex-shrink-0" />}
            <div>
              <p className={clsx('text-sm font-semibold', modeColor)}>{modeLabel}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {smtp?.mode === 'smtp' && 'Correos enviados mediante servidor SMTP configurado.'}
                {smtp?.mode === 'ethereal' && 'Modo QAS activo. Los correos se pueden previsualizar en Ethereal. No llegan a destinatarios reales.'}
                {smtp?.mode === 'none' && 'Sin transporter SMTP. Los correos solo se registran en el log del servidor.'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5">
            <ConfigRow label="Modo" value={<span className={clsx('font-semibold text-sm', modeColor)}>{modeLabel}</span>} />
            <ConfigRow label="Host SMTP" value={smtp?.host ?? <span className="text-slate-400 text-xs">No configurado</span>} mono={!!smtp?.host} />
            <ConfigRow label="Puerto" value={smtp?.port ?? <span className="text-slate-400 text-xs">—</span>} mono={!!smtp?.port} />
            <ConfigRow label="Usuario" value={smtp?.user ?? <span className="text-slate-400 text-xs">No configurado</span>} mono={!!smtp?.user} />
            <ConfigRow label="Remitente (From)" value={smtp?.from ?? <span className="text-slate-400 text-xs">—</span>} mono={!!smtp?.from} />
            <ConfigRow label="SSL/TLS" value={
              smtp?.secure
                ? <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><Shield size={12} />Activo</span>
                : <span className="text-xs text-slate-400">No</span>
            } />
            <ConfigRow label="Emails en log" value={smtp?.logCount ?? 0} mono />
          </div>

          {smtp?.mode === 'none' && (
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <Info size={13} className="flex-shrink-0 mt-0.5" />
              <span>
                Para configurar SMTP, edita el archivo <code className="font-mono bg-slate-100 px-1 rounded">.env</code> del backend con las variables
                <code className="font-mono bg-slate-100 px-1 rounded ml-1">SMTP_HOST</code>,
                <code className="font-mono bg-slate-100 px-1 rounded ml-1">SMTP_USER</code> y
                <code className="font-mono bg-slate-100 px-1 rounded ml-1">SMTP_PASS</code>, luego reinicia el servidor.
              </span>
            </div>
          )}

          {smtp?.mode === 'ethereal' && (
            <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Info size={13} className="flex-shrink-0 mt-0.5" />
              <span>
                En modo QAS, los correos se envían a Ethereal. Revisa la consola del backend para ver el enlace de previsualización de cada email enviado.
                <a href="https://ethereal.email" target="_blank" rel="noreferrer" className="ml-1 underline inline-flex items-center gap-0.5">
                  Abrir Ethereal <ExternalLink size={10} />
                </a>
              </span>
            </div>
          )}
        </section>

        {/* Enviar email de prueba — solo admin */}
        {user?.role === 'admin' && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Send size={13} />
              Enviar email de prueba
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <form onSubmit={handleSendTest} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Destinatario
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder={user?.email ?? 'correo@ejemplo.com'}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
                >
                  {sending ? <Spinner className="h-4 w-4 text-white" /> : <Send size={14} />}
                  {sending ? 'Enviando...' : 'Enviar prueba'}
                </button>
              </form>

              {testResult && (
                <div className={clsx(
                  'mt-3 flex items-center gap-2 text-sm px-4 py-3 rounded-xl border',
                  testResult.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                )}>
                  {testResult.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  {testResult.msg}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Quick links */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Info size={13} />
            Accesos rápidos
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Log de notificaciones', href: '/notifications', desc: 'Historial de correos enviados' },
              { label: 'Gestión de usuarios', href: '/users', desc: 'Crear y administrar usuarios' },
              { label: 'Reportes y KPIs', href: '/reports', desc: 'Métricas operativas en tiempo real' },
              { label: 'Cola de incidencias', href: '/incidents', desc: 'Gestión de tickets' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group"
              >
                <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{link.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{link.desc}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
