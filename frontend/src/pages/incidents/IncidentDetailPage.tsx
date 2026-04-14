import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { PageLoader, Spinner } from '../../components/ui/Spinner'
import type { Attachment, Comment, Incident, IncidentStatus, TrackingEvent } from '../../types'
import {
  MessageSquare,
  Clock,
  Paperclip,
  Download,
  Trash2,
  Lock,
  Globe,
} from 'lucide-react'

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

  // Comment form
  const [commentBody, setCommentBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  // Status change
  const [newStatus, setNewStatus] = useState<IncidentStatus | ''>('')
  const [statusComment, setStatusComment] = useState('')
  const [submittingStatus, setSubmittingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')

  // File upload
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
      await api.post(`/incidents/${id}/comments`, {
        body: commentBody,
        is_internal: isInternal,
      })
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
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', name)
    // For authenticated download, use fetch
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const objUrl = URL.createObjectURL(blob)
        a.href = objUrl
        a.click()
        URL.revokeObjectURL(objUrl)
      })
  }

  if (loading) return <PageLoader />
  if (!incident) return <div className="p-6 text-gray-500">Incidencia no encontrada</div>

  const allowedTransitions = STATUS_TRANSITIONS[incident.status] ?? []

  return (
    <AppShell>
      <PageHeader
        title={incident.ticketNumber}
        subtitle={incident.title}
        action={
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg"
          >
            ← Volver
          </button>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Descripción</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.description}</p>
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
              <MessageSquare size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Comentarios ({comments.length})</h3>
            </div>

            <div className="divide-y divide-gray-50">
              {comments.length === 0 && (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Sin comentarios aún.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-gray-700">{c.authorId.slice(0, 8)}…</span>
                    {c.isInternal && (
                      <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        <Lock size={10} />
                        Interno
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.body}</p>
                </div>
              ))}
            </div>

            {/* Add comment */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
              <form onSubmit={handleAddComment} className="space-y-3">
                <textarea
                  rows={3}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                />
                <div className="flex items-center justify-between">
                  {isAgent && (
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded"
                      />
                      {isInternal ? (
                        <span className="flex items-center gap-1 text-amber-700"><Lock size={12} />Comentario interno</span>
                      ) : (
                        <span className="flex items-center gap-1"><Globe size={12} />Público</span>
                      )}
                    </label>
                  )}
                  <button
                    type="submit"
                    disabled={submittingComment || !commentBody.trim()}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium px-3 py-2 rounded-lg ml-auto"
                  >
                    {submittingComment && <Spinner className="h-3 w-3 text-white" />}
                    Enviar
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Paperclip size={16} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Adjuntos ({attachments.length})</h3>
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
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {uploadingFile ? <Spinner className="h-3 w-3" /> : <Paperclip size={12} />}
                  Subir archivo
                </button>
              </div>
            </div>

            {uploadError && (
              <div className="mx-5 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {uploadError}
              </div>
            )}

            {attachments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Sin adjuntos.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 px-5 py-3">
                    <Paperclip size={14} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{att.originalName}</p>
                      <p className="text-xs text-gray-400">{formatBytes(att.sizeBytes)} · {att.mimeType}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownload(att.id, att.originalName)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                        title="Descargar"
                      >
                        <Download size={14} />
                      </button>
                      {(isAgent || att.uploaderId === user?.id) && (
                        <button
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
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

        {/* Sidebar column */}
        <div className="space-y-5">
          {/* Info card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Detalles</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Estado</span>
                <StatusBadge status={incident.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Prioridad</span>
                <PriorityBadge priority={incident.priority} />
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Reporter</span>
                <span className="text-right text-gray-700 text-xs break-all max-w-32">{incident.reporterEmail}</span>
              </div>
              {incident.assigneeId && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Asignado</span>
                  <span className="text-xs text-gray-700 font-mono">{incident.assigneeId.slice(0, 8)}…</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Versión</span>
                <span className="text-xs text-gray-600 font-mono">v{incident.version}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Creada</span>
                <span className="text-xs text-gray-600">{new Date(incident.createdAt).toLocaleDateString('es-CL')}</span>
              </div>
              {incident.resolvedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Resuelta</span>
                  <span className="text-xs text-gray-600">{new Date(incident.resolvedAt).toLocaleDateString('es-CL')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Agent actions: change status */}
          {isAgent && allowedTransitions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Cambiar estado</h3>
              <form onSubmit={handleChangeStatus} className="space-y-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as IncidentStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Selecciona estado --</option>
                  {allowedTransitions.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                {(newStatus === 'resolved' || newStatus === 'reopened') && (
                  <textarea
                    rows={2}
                    required
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder="Comentario requerido..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                )}
                {newStatus && newStatus !== 'resolved' && newStatus !== 'reopened' && (
                  <textarea
                    rows={2}
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder="Comentario opcional..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                )}
                {statusError && (
                  <p className="text-xs text-red-600">{statusError}</p>
                )}
                <button
                  type="submit"
                  disabled={!newStatus || submittingStatus}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {submittingStatus && <Spinner className="h-3.5 w-3.5 text-white" />}
                  Confirmar cambio
                </button>
              </form>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Timeline</h3>
            </div>
            <div className="space-y-3">
              {[...tracking].reverse().map((ev) => (
                <div key={ev.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800">
                      {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                    </p>
                    {ev.fieldChanged && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ev.fieldChanged}: <span className="line-through text-red-500">{ev.oldValue}</span>
                        {' → '}
                        <span className="text-green-600">{ev.newValue}</span>
                      </p>
                    )}
                    {ev.comment && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">"{ev.comment}"</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(ev.createdAt)}</p>
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
