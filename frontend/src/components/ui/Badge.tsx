import clsx from 'clsx'
import type { IncidentPriority, IncidentStatus } from '../../types'

const priorityClasses: Record<IncidentPriority, string> = {
  critical: 'bg-red-100 text-red-800 border border-red-200',
  high: 'bg-orange-100 text-orange-800 border border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  low: 'bg-green-100 text-green-800 border border-green-200',
}

const statusClasses: Record<IncidentStatus, string> = {
  open: 'bg-blue-100 text-blue-800 border border-blue-200',
  assigned: 'bg-purple-100 text-purple-800 border border-purple-200',
  in_progress: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  awaiting_info: 'bg-amber-100 text-amber-800 border border-amber-200',
  awaiting_vendor: 'bg-orange-100 text-orange-800 border border-orange-200',
  resolved: 'bg-teal-100 text-teal-800 border border-teal-200',
  closed: 'bg-gray-100 text-gray-700 border border-gray-200',
  reopened: 'bg-red-100 text-red-800 border border-red-200',
}

const priorityLabels: Record<IncidentPriority, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const statusLabels: Record<IncidentStatus, string> = {
  open: 'Abierta',
  assigned: 'Asignada',
  in_progress: 'En progreso',
  awaiting_info: 'Esp. información',
  awaiting_vendor: 'Esp. proveedor',
  resolved: 'Resuelta',
  closed: 'Cerrada',
  reopened: 'Reabierta',
}

export function PriorityBadge({ priority }: { priority: IncidentPriority }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', priorityClasses[priority])}>
      {priorityLabels[priority]}
    </span>
  )
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', statusClasses[status])}>
      {statusLabels[status]}
    </span>
  )
}
