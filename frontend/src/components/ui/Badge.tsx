import clsx from 'clsx'
import type { IncidentPriority, IncidentStatus } from '../../types'

const priorityConfig: Record<IncidentPriority, { dot: string; bg: string; text: string; label: string }> = {
  critical: { dot: 'bg-red-500', bg: 'bg-red-50 border border-red-200', text: 'text-red-700', label: 'Crítica' },
  high:     { dot: 'bg-orange-500', bg: 'bg-orange-50 border border-orange-200', text: 'text-orange-700', label: 'Alta' },
  medium:   { dot: 'bg-yellow-500', bg: 'bg-yellow-50 border border-yellow-200', text: 'text-yellow-700', label: 'Media' },
  low:      { dot: 'bg-emerald-500', bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-700', label: 'Baja' },
}

const statusConfig: Record<IncidentStatus, { dot: string; bg: string; text: string; label: string }> = {
  open:             { dot: 'bg-blue-500',    bg: 'bg-blue-50 border border-blue-200',     text: 'text-blue-700',    label: 'Abierta' },
  assigned:         { dot: 'bg-violet-500',  bg: 'bg-violet-50 border border-violet-200', text: 'text-violet-700',  label: 'Asignada' },
  in_progress:      { dot: 'bg-indigo-500',  bg: 'bg-indigo-50 border border-indigo-200', text: 'text-indigo-700',  label: 'En progreso' },
  awaiting_info:    { dot: 'bg-amber-500',   bg: 'bg-amber-50 border border-amber-200',   text: 'text-amber-700',   label: 'Esp. info' },
  awaiting_vendor:  { dot: 'bg-orange-500',  bg: 'bg-orange-50 border border-orange-200', text: 'text-orange-700',  label: 'Esp. proveedor' },
  resolved:         { dot: 'bg-teal-500',    bg: 'bg-teal-50 border border-teal-200',     text: 'text-teal-700',    label: 'Resuelta' },
  closed:           { dot: 'bg-slate-400',   bg: 'bg-slate-100 border border-slate-200',  text: 'text-slate-600',   label: 'Cerrada' },
  reopened:         { dot: 'bg-red-500',     bg: 'bg-red-50 border border-red-200',       text: 'text-red-700',     label: 'Reabierta' },
}

export function PriorityBadge({ priority }: { priority: IncidentPriority }) {
  const c = priorityConfig[priority]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', c.bg, c.text)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
      {c.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const c = statusConfig[status]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', c.bg, c.text)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
      {c.label}
    </span>
  )
}
