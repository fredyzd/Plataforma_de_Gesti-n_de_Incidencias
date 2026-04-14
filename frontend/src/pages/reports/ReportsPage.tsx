import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/api'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import { useIncidentListUpdates } from '../../hooks/useSocket'
import type { IncidentPriority, IncidentStatus } from '../../types'
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import clsx from 'clsx'

interface Summary {
  totals: { all: number; active: number; closed: number; createdToday: number }
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  sla: { compliant: number; breached: number; compliancePct: number | null; overdueActive: number }
  mttrHours: number | null
}

interface AgingBucket {
  range: string
  count: number
  tickets: { id: string; ticketNumber: string; title: string; priority: IncidentPriority; status: IncidentStatus; createdAt: string }[]
}

interface SlaTicket {
  id: string
  ticketNumber: string
  title: string
  priority: IncidentPriority
  status: IncidentStatus
  slaDeadlineAt: string
  remainingHours: number
  breached: boolean
  warning: boolean
}

function KpiCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 truncate capitalize">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={clsx('h-2 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-6 text-right">{value}</span>
    </div>
  )
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [aging, setAging] = useState<AgingBucket[]>([])
  const [sla, setSla] = useState<SlaTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [s, a, sl] = await Promise.all([
        api.get<Summary>('/reports/summary'),
        api.get<AgingBucket[]>('/reports/aging'),
        api.get<SlaTicket[]>('/reports/sla'),
      ])
      setSummary(s.data)
      setAging(a.data)
      setSla(sl.data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh on any incident event
  useIncidentListUpdates(useCallback(() => { void load(true) }, [load]))

  if (loading) return <PageLoader />
  if (!summary) return null

  const maxByStatus = Math.max(...Object.values(summary.byStatus))
  const maxByPriority = Math.max(...Object.values(summary.byPriority))

  return (
    <AppShell>
      <PageHeader
        title="Reportes y KPIs"
        subtitle="Resumen operativo en tiempo real"
        action={
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total incidencias"
            value={summary.totals.all}
            sub={`${summary.totals.createdToday} hoy`}
            icon={<BarChart3 size={20} className="text-blue-600" />}
            color="bg-blue-50"
          />
          <KpiCard
            label="Activas"
            value={summary.totals.active}
            icon={<Clock size={20} className="text-amber-600" />}
            color="bg-amber-50"
          />
          <KpiCard
            label="SLA Cumplimiento"
            value={summary.sla.compliancePct !== null ? `${summary.sla.compliancePct}%` : '—'}
            sub={`${summary.sla.breached} incumplidas`}
            icon={<CheckCircle2 size={20} className="text-green-600" />}
            color="bg-green-50"
          />
          <KpiCard
            label="MTTR"
            value={summary.mttrHours !== null ? `${summary.mttrHours}h` : '—'}
            sub="Tiempo medio resolución"
            icon={<TrendingUp size={20} className="text-purple-600" />}
            color="bg-purple-50"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Por estado</h3>
            <div className="space-y-2.5">
              {Object.entries(summary.byStatus)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <BarRow key={status} label={status.replace('_', ' ')} value={count} max={maxByStatus} color="bg-blue-500" />
                ))}
              {Object.values(summary.byStatus).every(v => v === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
              )}
            </div>
          </div>

          {/* By priority */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Por prioridad</h3>
            <div className="space-y-2.5">
              {[
                { key: 'critical', color: 'bg-red-500' },
                { key: 'high', color: 'bg-orange-500' },
                { key: 'medium', color: 'bg-yellow-500' },
                { key: 'low', color: 'bg-green-500' },
              ].map(({ key, color }) => (
                <BarRow
                  key={key}
                  label={key}
                  value={summary.byPriority[key] ?? 0}
                  max={maxByPriority}
                  color={color}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Aging report */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Aging — Tickets activos por antigüedad</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
            {aging.map((bucket) => (
              <div key={bucket.range} className="p-5">
                <p className="text-xs text-gray-500 font-medium">{bucket.range}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{bucket.count}</p>
                {bucket.tickets.slice(0, 3).map((t) => (
                  <div key={t.id} className="mt-2">
                    <a
                      href={`/incidents/${t.id}`}
                      className="block text-xs text-gray-500 hover:text-blue-600 truncate"
                    >
                      {t.ticketNumber}
                    </a>
                  </div>
                ))}
                {bucket.tickets.length > 3 && (
                  <p className="text-xs text-gray-400 mt-1">+{bucket.tickets.length - 3} más</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SLA detail */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">SLA — Tickets activos</h3>
            {summary.sla.overdueActive > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                <AlertTriangle size={12} />
                {summary.sla.overdueActive} vencido{summary.sla.overdueActive > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {sla.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No hay tickets activos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ticket</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Título</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tiempo restante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sla.map((t) => (
                    <tr key={t.id} className={clsx(
                      'hover:bg-gray-50 transition-colors',
                      t.breached && 'bg-red-50/50',
                      !t.breached && t.warning && 'bg-amber-50/50',
                    )}>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{t.ticketNumber}</td>
                      <td className="px-4 py-3">
                        <a href={`/incidents/${t.id}`} className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1">
                          {t.title}
                        </a>
                      </td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.breached ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                            <AlertTriangle size={12} />
                            Vencido ({Math.abs(t.remainingHours).toFixed(1)}h atrás)
                          </span>
                        ) : (
                          <span className={clsx('text-xs font-medium', t.warning ? 'text-amber-600' : 'text-green-600')}>
                            {t.remainingHours.toFixed(1)}h
                          </span>
                        )}
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
