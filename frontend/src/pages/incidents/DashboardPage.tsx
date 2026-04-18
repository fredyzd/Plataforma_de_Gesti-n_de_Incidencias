import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { ContentLoader } from '../../components/ui/Spinner'
import type { Incident } from '../../types'
import { TicketCheck, AlertCircle, Clock, CheckCircle2, Plus, ArrowRight, TrendingUp } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  iconBg: string
  trend?: string
}

function StatCard({ label, value, icon, iconBg, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{value}</p>
          {trend && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp size={11} />
              {trend}
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Incident[]>('/incidents').then((r) => {
      setIncidents(r.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <AppShell><ContentLoader /></AppShell>

  const open = incidents.filter((i) => i.status === 'open').length
  const inProgress = incidents.filter((i) => ['assigned', 'in_progress'].includes(i.status)).length
  const resolved = incidents.filter((i) => i.status === 'resolved').length
  const critical = incidents.filter((i) => i.priority === 'critical' && i.status !== 'closed').length

  const recent = [...incidents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  return (
    <AppShell>
      <PageHeader
        title={`Hola, ${user?.first_name} 👋`}
        subtitle="Resumen de incidencias del sistema"
        action={
          <Link
            to="/incidents/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nueva incidencia
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Abiertas"
            value={open}
            icon={<AlertCircle size={20} className="text-blue-600" />}
            iconBg="bg-blue-50"
          />
          <StatCard
            label="En progreso"
            value={inProgress}
            icon={<Clock size={20} className="text-amber-600" />}
            iconBg="bg-amber-50"
          />
          <StatCard
            label="Resueltas"
            value={resolved}
            icon={<CheckCircle2 size={20} className="text-emerald-600" />}
            iconBg="bg-emerald-50"
          />
          <StatCard
            label="Críticas activas"
            value={critical}
            icon={<TicketCheck size={20} className="text-red-600" />}
            iconBg="bg-red-50"
          />
        </div>

        {/* Recent incidents */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Incidencias recientes</h2>
            <Link
              to="/incidents"
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Ver todas
              <ArrowRight size={12} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TicketCheck size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No hay incidencias aún</p>
              <p className="text-xs text-slate-400 mt-1">Las nuevas incidencias aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recent.map((inc) => (
                <Link
                  key={inc.id}
                  to={`/incidents/${inc.id}`}
                  className="group flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700 truncate transition-colors">
                      {inc.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{inc.ticketNumber}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={inc.priority} />
                    <StatusBadge status={inc.status} />
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
