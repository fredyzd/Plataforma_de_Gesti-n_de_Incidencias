import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/api'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { ContentLoader } from '../../components/ui/Spinner'
import {
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Inbox,
} from 'lucide-react'
import clsx from 'clsx'

type NotificationStatus = 'sent' | 'failed' | 'skipped'

interface NotificationLogEntry {
  id: string
  to: string
  subject: string
  event: string
  status: NotificationStatus
  messageId: string | null
  errorMessage: string | null
  createdAt: string
}

const STATUS_CONFIG: Record<NotificationStatus, { label: string; icon: React.ReactNode; bg: string; text: string; dot: string }> = {
  sent:    { label: 'Enviado',    icon: <CheckCircle2 size={13} />, bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  failed:  { label: 'Error',      icon: <XCircle size={13} />,      bg: 'bg-red-50 border-red-200',         text: 'text-red-700',     dot: 'bg-red-500' },
  skipped: { label: 'Omitido',    icon: <AlertTriangle size={13} />, bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   dot: 'bg-amber-500' },
}

const EVENT_LABELS: Record<string, string> = {
  'incident.created':        'Incidencia creada',
  'incident.assigned':       'Incidencia asignada',
  'incident.status_changed': 'Estado cambiado',
  'incident.comment_added':  'Comentario añadido',
  'auth.reset_password':     'Recuperación de contraseña',
  'test':                    'Email de prueba',
}

function StatusBadge({ status }: { status: NotificationStatus }) {
  const c = STATUS_CONFIG[status]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', c.bg, c.text)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const [entries, setEntries] = useState<NotificationLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const { data } = await api.get<NotificationLogEntry[]>('/notifications/log')
      setEntries(data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = entries.filter((e) => {
    const matchStatus = !statusFilter || e.status === statusFilter
    const matchSearch = !search || [e.to, e.subject, e.event].some(
      (v) => v.toLowerCase().includes(search.toLowerCase())
    )
    return matchStatus && matchSearch
  })

  const counts = {
    sent:    entries.filter((e) => e.status === 'sent').length,
    failed:  entries.filter((e) => e.status === 'failed').length,
    skipped: entries.filter((e) => e.status === 'skipped').length,
  }

  if (loading) return <AppShell><ContentLoader /></AppShell>

  return (
    <AppShell>
      <PageHeader
        title="Log de notificaciones"
        subtitle={`${entries.length} registros en memoria (últimos 500)`}
        action={
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {(['sent', 'failed', 'skipped'] as const).map((s) => {
            const c = STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                className={clsx(
                  'bg-white rounded-2xl border p-4 text-left transition-all shadow-sm hover:shadow-md',
                  statusFilter === s ? `${c.bg} border-current` : 'border-slate-200'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={c.text}>{c.icon}</span>
                  <span className={clsx('text-xs font-semibold uppercase tracking-wider', c.text)}>{c.label}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 tabular-nums">{counts[s]}</p>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex gap-2 items-center bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
          <Search size={13} className="text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Buscar por destinatario, asunto o evento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none"
          />
          {(search || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('') }}
              className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No hay registros que mostrar</p>
              <p className="text-xs text-slate-400 mt-1">
                {entries.length === 0
                  ? 'El sistema aún no ha enviado notificaciones'
                  : 'Ajusta los filtros de búsqueda'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Destinatario</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Evento</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Asunto</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((e) => (
                    <tr key={e.id} className={clsx(
                      'group hover:bg-slate-50/70 transition-colors',
                      e.status === 'failed' && 'bg-red-50/30'
                    )}>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 font-medium">
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="text-slate-400 flex-shrink-0" />
                          {e.to}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {EVENT_LABELS[e.event] ?? e.event}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                        {e.subject}
                        {e.errorMessage && (
                          <p className="text-red-500 mt-0.5 truncate">{e.errorMessage}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(e.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
