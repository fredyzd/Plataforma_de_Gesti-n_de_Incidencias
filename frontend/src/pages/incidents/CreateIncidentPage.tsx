import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import type { IncidentPriority } from '../../types'

const PRIORITIES: { value: IncidentPriority; label: string; desc: string }[] = [
  { value: 'critical', label: 'Crítica', desc: 'Servicio caído, impacto masivo' },
  { value: 'high', label: 'Alta', desc: 'Impacto significativo, sin workaround' },
  { value: 'medium', label: 'Media', desc: 'Impacto moderado, workaround disponible' },
  { value: 'low', label: 'Baja', desc: 'Impacto menor, solicitud de mejora' },
]

export default function CreateIncidentPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<IncidentPriority>('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 5) {
      setError('El título debe tener al menos 5 caracteres')
      return
    }
    if (description.trim().length < 10) {
      setError('La descripción debe tener al menos 10 caracteres')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/incidents', { title, description, priority })
      navigate(`/incidents/${data.id}`)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al crear la incidencia'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <PageHeader title="Nueva incidencia" subtitle="Reporta un problema o solicitud" />
      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
                placeholder="Describe brevemente el problema"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">{title.length}/300</p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el problema con detalle: qué ocurrió, cuándo empezó, pasos para reproducirlo, impacto..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridad <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      priority === p.value
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <span className="font-medium">{p.label}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading && <Spinner className="h-4 w-4 text-white" />}
                {loading ? 'Enviando...' : 'Crear incidencia'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
