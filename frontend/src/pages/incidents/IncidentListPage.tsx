import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { ContentLoader } from '../../components/ui/Spinner'
import type { Incident, IncidentPriority, IncidentStatus } from '../../types'
import { Plus, Search, SlidersHorizontal, ArrowRight, Inbox } from 'lucide-react'

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

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

  if (loading) return <AppShell><ContentLoader /></AppShell>

  return (
    <AppShell>
      <PageHeader
        title={isAgent ? 'Cola de incidencias' : 'Mis incidencias'}
        subtitle={`${filtered.length} incidencia${filtered.length !== 1 ? 's' : ''}`}
        action={
          <Link
            to="/incidents/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nueva
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters bar */}
        <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
          <SlidersHorizontal size={14} className="text-slate-400 ml-1" />
          <div className="relative flex-1 min-w-44">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título o ticket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | '')}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as IncidentPriority | '')}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(statusFilter || priorityFilter || search) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter('') }}
              className="text-xs text-slate-500 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
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
              <p className="text-sm font-medium text-slate-600">No hay incidencias que mostrar</p>
              <p className="text-xs text-slate-400 mt-1">Intenta ajustar los filtros de búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ticket</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prioridad</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Creada</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((inc) => (
                    <tr key={inc.id} className="group hover:bg-indigo-50/40 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-400 whitespace-nowrap">
                        {inc.ticketNumber}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="font-medium text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-1"
                        >
                          {inc.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <PriorityBadge priority={inc.priority} />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={inc.status} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(inc.createdAt)}
                      </td>
                      <td className="px-3 py-3.5">
                        <Link to={`/incidents/${inc.id}`}>
                          <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                        </Link>
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
