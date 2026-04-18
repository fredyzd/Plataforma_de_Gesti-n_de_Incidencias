import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import type { IncidentPriority } from '../../types'
import { AlertCircle, ChevronLeft, Zap, TrendingUp, Minus, TrendingDown } from 'lucide-react'
import clsx from 'clsx'

const PRIORITIES: {
  value: IncidentPriority
  label: string
  desc: string
  icon: React.ReactNode
  active: string
  ring: string
} [] = [
  {
    value: 'critical',
    label: 'Crítica',
    desc: 'Servicio caído, impacto masivo',
    icon: <Zap size={15} />,
    active: 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-200',
    ring: 'hover:border-red-300',
  },
  {
    value: 'high',
    label: 'Alta',
    desc: 'Impacto significativo, sin workaround',
    icon: <TrendingUp size={15} />,
    active: 'border-orange-500 bg-orange-50 text-orange-800 ring-2 ring-orange-200',
    ring: 'hover:border-orange-300',
  },
  {
    value: 'medium',
    label: 'Media',
    desc: 'Impacto moderado, workaround disponible',
    icon: <Minus size={15} />,
    active: 'border-yellow-500 bg-yellow-50 text-yellow-800 ring-2 ring-yellow-200',
    ring: 'hover:border-yellow-300',
  },
  {
    value: 'low',
    label: 'Baja',
    desc: 'Impacto menor, solicitud de mejora',
    icon: <TrendingDown size={15} />,
    active: 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200',
    ring: 'hover:border-emerald-300',
  },
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
      <PageHeader
        title="Nueva incidencia"
        subtitle="Reporta un problema o solicitud de servicio"
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
      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
                placeholder="Describe brevemente el problema"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-shadow"
              />
              <p className="text-xs text-slate-400 mt-1.5 text-right">{title.length}/300</p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el problema con detalle: qué ocurrió, cuándo empezó, pasos para reproducirlo, impacto..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-shadow"
              />
              <p className="text-xs text-slate-400 mt-1.5 text-right">{description.length}/4000</p>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Prioridad <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={clsx(
                      'text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150',
                      priority === p.value
                        ? p.active
                        : `border-slate-200 text-slate-600 bg-white ${p.ring}`
                    )}
                  >
                    <span className="flex items-center gap-2 font-semibold mb-0.5">
                      {p.icon}
                      {p.label}
                    </span>
                    <span className="block text-xs opacity-70 font-normal">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
              >
                {loading && <Spinner className="h-4 w-4 text-white" />}
                {loading ? 'Enviando...' : 'Crear incidencia'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors bg-white"
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
