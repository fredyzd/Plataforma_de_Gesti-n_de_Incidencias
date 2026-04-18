import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { ContentLoader, Spinner } from '../../components/ui/Spinner'
import type { Attachment, Comment, Incident, IncidentStatus, TrackingEvent } from '../../types'
import {
  MessageSquare,
  Clock,
  Paperclip,
  Download,
  Trash2,
  Lock,
  Globe,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  User,
  Calendar,
} from 'lucide-react'
import clsx from 'clsx'

const AGENT_ROLES = new Set(['agent', 'supervisor', 'admin'])

const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['assigned', 'in_progress', 'closed'],
  assigned: ['in_progress', 'awaiting_info', 'awaiting_vendor', 'resolved', 'closed'],
  in_progress: ['awaiting_info', 'awaiting_vendor', 'resolved', 'closed'],
  awaiting_info: ['in_progress', 'resolved', 'closed'],
  awaiting_vendor: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['assigned', 'in_progress', 'resolved', 'closed'],
}

const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Abierta',
  assigned: 'Asignada',
  in_progress: 'En progreso',
  awaiting_info: 'Esp. información',
  awaiting_vendor: 'Esp. proveedor',
  resolved: 'Resuelta',
  closed: 'Cerrada',
  reopened: 'Reabierta',
}

const EVENT_LABELS: Record<string, string> = {
  created: 'Incidencia creada',
  assigned: 'Asignada a agente',
  status_changed: 'Estado cambiado',
  priority_changed: 'Prioridad cambiada',
  comment_added: 'Comentario añadido',
  resolved: 'Marcada como resuelta',
  closed: 'Cerrada',
  reopened: 'Reabierta',
  field_updated: 'Campo actualizado',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function SlaIndicator({ incident }: { incident: Incident }) {
  if (!incident.slaDeadlineAt) return null
  const now = new Date()
  const deadline = new Date(incident.slaDeadlineAt)
  const finishedAt = incident.resolvedAt ?? incident.closedAt
  const breached = incident.slaBreached || (!finishedAt && now > deadline)
  const remainingMs = deadline.getTime() - now.getTime()
  const remainingH = remainingMs / 3600000
  const isActive = !['resolved', 'closed'].includes(incident.status)

  if (breached) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
        <AlertTriangle size={13} />
        <span>SLA vencido</span>
      </div>
    )
  }
  if (isActive && remainingH < 4) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-700">
        <Clock size={13} />
        <span>SLA: {remainingH.toFixed(1)}h restantes</span>
      </div>
    )
  }
  if (!isActive) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-700">
        <CheckCircle2 size={13} />
        <span>SLA cumplido</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600">
      <Clock size={13} />
      <span>SLA: {remainingH.toFixed(0)}h restantes</span>
    </div>
  )
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAgent = AGENT_ROLES.has(user?.role ?? '')

  const [incident, setIncident] = useState<Incident | null>(null)
  const [tracking, setTracking] = useState<TrackingEvent[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)

  const [commentBody, setCommentBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  const [newStatus, setNewStatus] = useState<IncidentStatus | ''>('')
  const [statusComment, setStatusComment] = useState('')
  const [submittingStatus, setSubmittingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const reload = async () => {
    if (!id) return
    const [inc, track, cmts, atts] = await Promise.all([
      api.get<Incident>(`/incidents/${id}`),
      api.get<TrackingEvent[]>(`/incidents/${id}/tracking`),
      api.get<Comment[]>(`/incidents/${id}/comments`),
      api.get<Attachment[]>(`/incidents/${id}/attachments`),
    ])
    setIncident(inc.data)
    setTracking(track.data)
    setComments(cmts.data)
    setAttachments(atts.data)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [id])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentBody.trim()) return
    setSubmittingComment(true)
    try {
      await api.post(`/incidents/${id}/comments`, { body: commentBody, is_internal: isInternal })
      setCommentBody('')
      await reload()
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleChangeStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStatus || !incident) return
    setStatusError('')
    setSubmittingStatus(true)
    try {
      await api.post(`/incidents/${id}/status`, {
        status: newStatus,
        comment: statusComment || undefined,
        expected_version: incident.version,
      })
      setNewStatus('')
      setStatusComment('')
      await reload()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al cambiar estado'
      setStatusError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setSubmittingStatus(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploadingFile(true)
    const form = new FormData()
    form.append('file', file)
    try {
      await api.post(`/incidents/${id}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await reload()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al subir el archivo'
      setUploadError(msg)
    } finally {
      setUploadingFile(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDeleteAttachment = async (attId: string) => {
    if (!confirm('¿Eliminar este adjunto?')) return
    await api.delete(`/incidents/${id}/attachments/${attId}`)
    await reload()
  }

  const handleDownload = (attId: string, name: string) => {
    const token = localStorage.getItem('access_token')
    const url = `/api/incidents/${id}/attachments/${attId}/download`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const objUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objUrl
        a.setAttribute('download', name)
        a.click()
        URL.revokeObjectURL(objUrl)
      })
  }

  if (loading) return <AppShell><ContentLoader /></AppShell>
  if (!incident) return (
    <AppShell>
      <div className="p-6 text-slate-500">Incidencia no encontrada.</div>
    </AppShell>
  )

  const allowedTransitions = STATUS_TRANSITIONS[incident.status] ?? []

  return (
    <AppShell>
      <PageHeader
        title={incident.ticketNumber}
        subtitle={incident.title}
        action={
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={15} />
            Volver
          </button>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Descripción</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{incident.description}</p>
          </div>

          {/* Comments */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
              <MessageSquare size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Comentarios</h3>
              <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{comments.length}</span>
            </div>

            <div className="divide-y divide-slate-50">
              {comments.length === 0 && (
                <p className="px-5 py-8 text-sm text-slate-400 text-center">Sin comentarios aún.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className={clsx('px-5 py-4', c.isInternal && 'bg-amber-50/50')}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <User size={11} className="text-indigo-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">{c.authorId.slice(0, 8)}…</span>
                    {c.isInternal && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full font-medium">
                        <Lock size={9} />
                        Interno
                      </span>
                    )}
                    <span className="text-xs text-slate-400 ml-auto">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed pl-8">{c.body}</p>
                </div>
              ))}
            </div>

            {/* Add comment form */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/40 rounded-b-2xl">
              <form onSubmit={handleAddComment} className="space-y-3">
                <textarea
                  rows={3}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none bg-white"
                />
                <div className="flex items-center justify-between">
                  {isAgent && (
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded"
                      />
                      {isInternal ? (
                        <span className="flex items-center gap-1 text-amber-700 font-medium"><Lock size={11} />Interno</span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500"><Globe size={11} />Público</span>
                      )}
                    </label>
                  )}
                  <button
                    type="submit"
                    disabled={submittingComment || !commentBody.trim()}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold px-4 py-2 rounded-xl ml-auto transition-colors"
                  >
                    {submittingComment && <Spinner className="h-3 w-3 text-white" />}
                    Enviar
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Paperclip size={15} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Adjuntos</h3>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{attachments.length}</span>
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingFile}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  {uploadingFile ? <Spinner className="h-3 w-3" /> : <Paperclip size={11} />}
                  Subir archivo
                </button>
              </div>
            </div>

            {uploadError && (
              <div className="mx-5 mt-3 text-xs text-red-700 bg-red-50 border border-red-200 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                <AlertTriangle size={12} />
                {uploadError}
              </div>
            )}

            {attachments.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">Sin adjuntos.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Paperclip size={13} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{att.originalName}</p>
                      <p className="text-xs text-slate-400">{formatBytes(att.sizeBytes)} · {att.mimeType}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(att.id, att.originalName)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Descargar"
                      >
                        <Download size={14} />
                      </button>
                      {(isAgent || att.uploaderId === user?.id) && (
                        <button
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* SLA indicator */}
          <SlaIndicator incident={incident} />

          {/* Info card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Detalles</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Estado</span>
                <StatusBadge status={incident.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Prioridad</span>
                <PriorityBadge priority={incident.priority} />
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-start gap-2 mb-2">
                  <User size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Reporter</p>
                    <p className="text-xs font-medium text-slate-700 break-all">{incident.reporterEmail}</p>
                  </div>
                </div>
                {incident.assigneeId && (
                  <div className="flex items-start gap-2">
                    <User size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Asignado</p>
                      <p className="text-xs font-medium text-slate-700 font-mono">{incident.assigneeId.slice(0, 8)}…</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-slate-400" />
                  <div className="flex justify-between flex-1 items-center">
                    <span className="text-xs text-slate-500">Creada</span>
                    <span className="text-xs text-slate-600">{formatDateShort(incident.createdAt)}</span>
                  </div>
                </div>
                {incident.slaDeadlineAt && (
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-slate-400" />
                    <div className="flex justify-between flex-1 items-center">
                      <span className="text-xs text-slate-500">SLA deadline</span>
                      <span className="text-xs text-slate-600">{formatDateShort(incident.slaDeadlineAt)}</span>
                    </div>
                  </div>
                )}
                {incident.resolvedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <div className="flex justify-between flex-1 items-center">
                      <span className="text-xs text-slate-500">Resuelta</span>
                      <span className="text-xs text-slate-600">{formatDateShort(incident.resolvedAt)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Versión</span>
                  <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">v{incident.version}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Change status */}
          {isAgent && allowedTransitions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Cambiar estado</h3>
              <form onSubmit={handleChangeStatus} className="space-y-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as IncidentStatus)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">— Seleccionar estado —</option>
                  {allowedTransitions.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                {newStatus && (
                  <textarea
                    rows={2}
                    required={newStatus === 'resolved' || newStatus === 'reopened'}
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder={newStatus === 'resolved' || newStatus === 'reopened' ? 'Comentario requerido…' : 'Comentario opcional…'}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                )}
                {statusError && (
                  <p className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertTriangle size={11} />
                    {statusError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={!newStatus || submittingStatus}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {submittingStatus && <Spinner className="h-3.5 w-3.5 text-white" />}
                  Confirmar cambio
                </button>
              </form>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Timeline</h3>
            </div>
            <div className="space-y-4">
              {[...tracking].reverse().map((ev, idx) => (
                <div key={ev.id} className="flex gap-3">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1" />
                    {idx < tracking.length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1.5" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-xs font-semibold text-slate-800">
                      {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                    </p>
                    {ev.fieldChanged && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ev.fieldChanged}:{' '}
                        <span className="line-through text-red-500">{ev.oldValue}</span>
                        {' → '}
                        <span className="text-emerald-600 font-medium">{ev.newValue}</span>
                      </p>
                    )}
                    {ev.comment && (
                      <p className="text-xs text-slate-500 mt-0.5 italic">"{ev.comment}"</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">{formatDate(ev.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
