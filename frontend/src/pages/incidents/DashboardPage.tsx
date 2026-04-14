import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import type { Incident } from '../../types'
import { TicketCheck, AlertCircle, Clock, CheckCircle, Plus } from 'lucide-react'

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
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

  if (loading) return <PageLoader />

  const open = incidents.filter((i) => i.status === 'open').length
  const inProgress = incidents.filter((i) => ['assigned', 'in_progress'].includes(i.status)).length
  const resolved = incidents.filter((i) => i.status === 'resolved').length
  const critical = incidents.filter((i) => i.priority === 'critical' && i.status !== 'closed').length

  const isAgent = ['agent', 'supervisor', 'admin'].includes(user?.role ?? '')

  const recent = [...incidents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <AppShell>
      <PageHeader
        title={`Hola, ${user?.first_name}`}
        subtitle="Resumen de incidencias"
        action={
          !isAgent ? (
            <Link
              to="/incidents/new"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Nueva incidencia
            </Link>
          ) : undefined
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Abiertas"
            value={open}
            icon={<AlertCircle size={20} className="text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            label="En progreso"
            value={inProgress}
            icon={<Clock size={20} className="text-amber-600" />}
            color="bg-amber-50"
          />
          <StatCard
            label="Resueltas"
            value={resolved}
            icon={<CheckCircle size={20} className="text-green-600" />}
            color="bg-green-50"
          />
          <StatCard
            label="Críticas activas"
            value={critical}
            icon={<TicketCheck size={20} className="text-red-600" />}
            color="bg-red-50"
          />
        </div>

        {/* Recent incidents */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Incidencias recientes</h2>
            <Link to="/incidents" className="text-xs text-blue-600 hover:underline">
              Ver todas
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              No hay incidencias registradas aún.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map((inc) => (
                <Link
                  key={inc.id}
                  to={`/incidents/${inc.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inc.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{inc.ticketNumber}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={inc.priority} />
                    <StatusBadge status={inc.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
