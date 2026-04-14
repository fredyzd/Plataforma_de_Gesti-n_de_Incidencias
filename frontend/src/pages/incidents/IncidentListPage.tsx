import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import type { Incident, IncidentPriority, IncidentStatus } from '../../types'
import { Plus, Search } from 'lucide-react'

const STATUS_OPTIONS: { value: IncidentStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'open', label: 'Abierta' },
  { value: 'assigned', label: 'Asignada' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'awaiting_info', label: 'Esp. información' },
  { value: 'awaiting_vendor', label: 'Esp. proveedor' },
  { value: 'resolved', label: 'Resuelta' },
  { value: 'closed', label: 'Cerrada' },
  { value: 'reopened', label: 'Reabierta' },
]

const PRIORITY_OPTIONS: { value: IncidentPriority | ''; label: string }[] = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'critical', label: 'Crítica' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
]

export default function IncidentListPage() {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<IncidentPriority | ''>('')

  const isAgent = ['agent', 'supervisor', 'admin'].includes(user?.role ?? '')

  const load = () => {
    const params: Record<string, string> = {}
    if (statusFilter) params.status = statusFilter
    if (priorityFilter) params.priority = priorityFilter
    api.get<Incident[]>('/incidents', { params }).then((r) => {
      setIncidents(r.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    load()
  }, [statusFilter, priorityFilter])

  const filtered = incidents.filter((i) =>
    search
      ? i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.ticketNumber.toLowerCase().includes(search.toLowerCase())
      : true
  )

  if (loading) return <PageLoader />

  return (
    <AppShell>
      <PageHeader
        title={isAgent ? 'Cola de incidencias' : 'Mis incidencias'}
        subtitle={`${filtered.length} incidencia${filtered.length !== 1 ? 's' : ''}`}
        action={
          !isAgent ? (
            <Link
              to="/incidents/new"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
            >
              <Plus size={16} />
              Nueva
            </Link>
          ) : undefined
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título o ticket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as IncidentPriority | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No hay incidencias que mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Ticket</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Título</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Prioridad</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((inc) => (
                    <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                        {inc.ticketNumber}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                        >
                          {inc.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={inc.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inc.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(inc.createdAt).toLocaleDateString('es-CL')}
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
