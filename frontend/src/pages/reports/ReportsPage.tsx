import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/api'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { ContentLoader } from '../../components/ui/Spinner'
import { useIncidentListUpdates } from '../../hooks/useSocket'
import type { IncidentPriority, IncidentStatus } from '../../types'
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  Activity,
  Link as LinkIcon,
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

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  assigned: 'Asignada',
  in_progress: 'En progreso',
  awaiting_info: 'Esp. información',
  awaiting_vendor: 'Esp. proveedor',
  resolved: 'Resuelta',
  closed: 'Cerrada',
  reopened: 'Reabierta',
}

const PRIORITY_COLORS: Record<string, { bar: string; dot: string }> = {
  critical: { bar: 'bg-red-500', dot: 'bg-red-500' },
  high: { bar: 'bg-orange-500', dot: 'bg-orange-500' },
  medium: { bar: 'bg-yellow-500', dot: 'bg-yellow-500' },
  low: { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500',
  assigned: 'bg-violet-500',
  in_progress: 'bg-indigo-500',
  awaiting_info: 'bg-amber-500',
  awaiting_vendor: 'bg-orange-500',
  resolved: 'bg-teal-500',
  closed: 'bg-slate-400',
  reopened: 'bg-red-500',
}

function KpiCard({ label, value, sub, icon, colorBg, colorIcon }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  colorBg: string
  colorIcon: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', colorBg)}>
          <span className={colorIcon}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

function BarRow({ label, value, max, barColor }: { label: string; value: number; max: number; barColor: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 w-32 truncate">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={clsx('h-2 rounded-full transition-all duration-500', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-6 text-right tabular-nums">{value}</span>
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
  useIncidentListUpdates(useCallback(() => { void load(true) }, [load]))

  if (loading) return <AppShell><ContentLoader /></AppShell>
  if (!summary) return null

  const maxByStatus = Math.max(...Object.values(summary.byStatus), 1)
  const maxByPriority = Math.max(...Object.values(summary.byPriority), 1)

  return (
    <AppShell>
      <PageHeader
        title="Reportes y KPIs"
        subtitle="Resumen operativo en tiempo real"
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

      <div className="p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total incidencias"
            value={summary.totals.all}
            sub={`${summary.totals.createdToday} creadas hoy`}
            icon={<BarChart3 size={20} />}
            colorBg="bg-blue-50"
            colorIcon="text-blue-600"
          />
          <KpiCard
            label="Activas"
            value={summary.totals.active}
            sub={`${summary.totals.closed} cerradas`}
            icon={<Activity size={20} />}
            colorBg="bg-amber-50"
            colorIcon="text-amber-600"
          />
          <KpiCard
            label="SLA Cumplimiento"
            value={summary.sla.compliancePct !== null ? `${summary.sla.compliancePct}%` : '—'}
            sub={`${summary.sla.breached} incumplidas · ${summary.sla.overdueActive} vencidas`}
            icon={<CheckCircle2 size={20} />}
            colorBg="bg-emerald-50"
            colorIcon="text-emerald-600"
          />
          <KpiCard
            label="MTTR"
            value={summary.mttrHours !== null ? `${summary.mttrHours}h` : '—'}
            sub="Tiempo medio de resolución"
            icon={<TrendingUp size={20} />}
            colorBg="bg-purple-50"
            colorIcon="text-purple-600"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* By status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Clock size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Distribución por estado</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(summary.byStatus)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <BarRow
                    key={status}
                    label={STATUS_LABELS[status] ?? status}
                    value={count}
                    max={maxByStatus}
                    barColor={STATUS_COLORS[status] ?? 'bg-slate-500'}
                  />
                ))}
              {Object.values(summary.byStatus).every(v => v === 0) && (
                <p className="text-sm text-slate-400 text-center py-6">Sin datos</p>
              )}
            </div>
          </div>

          {/* By priority */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Distribución por prioridad</h3>
            </div>
            <div className="space-y-3">
              {(['critical', 'high', 'medium', 'low'] as const).map((key) => (
                <BarRow
                  key={key}
                  label={PRIORITY_LABELS[key]}
                  value={summary.byPriority[key] ?? 0}
                  max={maxByPriority}
                  barColor={PRIORITY_COLORS[key].bar}
                />
              ))}
            </div>
            {/* Mini donut summary */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-3">
              {(['critical', 'high', 'medium', 'low'] as const).map((key) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={clsx('w-2 h-2 rounded-full', PRIORITY_COLORS[key].dot)} />
                  {PRIORITY_LABELS[key]}: <span className="font-semibold text-slate-700">{summary.byPriority[key] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Aging report */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock size={15} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Aging — Tickets activos por antigüedad</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {aging.map((bucket, i) => (
              <div
                key={bucket.range}
                className={clsx('p-5', i < aging.length - 1 && 'border-r border-slate-100')}
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{bucket.range}</p>
                <p className={clsx(
                  'text-4xl font-bold mt-2 tabular-nums',
                  bucket.count > 5 ? 'text-red-600' : bucket.count > 2 ? 'text-amber-600' : 'text-slate-900'
                )}>
                  {bucket.count}
                </p>
                <div className="mt-3 space-y-1.5">
                  {bucket.tickets.slice(0, 3).map((t) => (
                    <a
                      key={t.id}
                      href={`/incidents/${t.id}`}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 truncate transition-colors group"
                    >
                      <LinkIcon size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="truncate font-mono">{t.ticketNumber}</span>
                    </a>
                  ))}
                  {bucket.tickets.length > 3 && (
                    <p className="text-xs text-slate-400">+{bucket.tickets.length - 3} más</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SLA detail */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">SLA — Tickets activos</h3>
            </div>
            {summary.sla.overdueActive > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-full">
                <AlertTriangle size={11} />
                {summary.sla.overdueActive} vencido{summary.sla.overdueActive > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {sla.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No hay tickets activos con SLA</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prioridad</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiempo restante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sla.map((t) => (
                    <tr
                      key={t.id}
                      className={clsx(
                        'group hover:bg-slate-50 transition-colors',
                        t.breached && 'bg-red-50/60',
                        !t.breached && t.warning && 'bg-amber-50/40',
                      )}
                    >
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-400 whitespace-nowrap">{t.ticketNumber}</td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <a
                          href={`/incidents/${t.id}`}
                          className="font-medium text-slate-800 hover:text-indigo-700 transition-colors line-clamp-1"
                        >
                          {t.title}
                        </a>
                      </td>
                      <td className="px-5 py-3.5">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {t.breached ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                            <AlertTriangle size={12} />
                            Vencido ({Math.abs(t.remainingHours).toFixed(1)}h atrás)
                          </span>
                        ) : (
                          <span className={clsx(
                            'flex items-center gap-1.5 text-xs font-semibold',
                            t.warning ? 'text-amber-600' : 'text-emerald-600'
                          )}>
                            <Clock size={12} />
                            {t.remainingHours.toFixed(1)}h restantes
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
