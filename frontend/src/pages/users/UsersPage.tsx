import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { AppShell, PageHeader } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import type { Role, UserDetail } from '../../types'
import {
  Plus,
  X,
  Users,
  CheckCircle2,
  XCircle,
  KeyRound,
  Pencil,
  AlertCircle,
  Check,
} from 'lucide-react'
import clsx from 'clsx'

const ROLE_CONFIG: Record<Role, { label: string; color: string }> = {
  admin:      { label: 'Admin',      color: 'bg-red-50 text-red-700 border border-red-200' },
  supervisor: { label: 'Supervisor', color: 'bg-purple-50 text-purple-700 border border-purple-200' },
  agent:      { label: 'Agente',     color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  reporter:   { label: 'Reporter',   color: 'bg-slate-100 text-slate-600 border border-slate-200' },
}

function RoleBadge({ role }: { role: Role }) {
  const c = ROLE_CONFIG[role] ?? ROLE_CONFIG.reporter
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', c.color)}>
      {c.label}
    </span>
  )
}

interface CreateForm {
  email: string
  first_name: string
  last_name: string
  role: Role
  department: string
  password: string
}

const EMPTY_FORM: CreateForm = {
  email: '', first_name: '', last_name: '', role: 'reporter', department: '', password: '',
}

interface EditForm {
  first_name: string
  last_name: string
  role: Role
  department: string
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<UserDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_FORM)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ first_name: '', last_name: '', role: 'reporter', department: '' })
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetMsg, setResetMsg] = useState<{ id: string; msg: string } | null>(null)

  const loadUsers = () =>
    api.get<UserDetail[]>('/users').then((r) => setUsers(r.data)).finally(() => setLoading(false))

  useEffect(() => { loadUsers() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    try {
      await api.post('/users', {
        email: createForm.email,
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        role: createForm.role,
        department: createForm.department || undefined,
        password: createForm.password || undefined,
      })
      setCreateForm(EMPTY_FORM)
      setShowCreate(false)
      await loadUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al crear usuario'
      setCreateError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (u: UserDetail) => {
    setEditingId(u.id)
    setEditForm({ first_name: u.firstName, last_name: u.lastName, role: u.role, department: u.department ?? '' })
    setEditError('')
  }

  const handleSaveEdit = async (id: string) => {
    setEditError('')
    setSaving(true)
    try {
      await api.patch(`/users/${id}`, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        role: editForm.role,
        department: editForm.department || undefined,
      })
      setEditingId(null)
      await loadUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar'
      setEditError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (u: UserDetail) => {
    if (u.id === me?.id) return
    await api.patch(`/users/${u.id}`, { active: !u.active })
    await loadUsers()
  }

  const handleResetPassword = async (u: UserDetail) => {
    if (!confirm(`¿Resetear contraseña de ${u.firstName} ${u.lastName}? Se asignará la contraseña temporal.`)) return
    const { data } = await api.post<{ tempPassword: string }>(`/users/${u.id}/reset-password`)
    setResetMsg({ id: u.id, msg: `Contraseña temporal: ${data.tempPassword}` })
    setTimeout(() => setResetMsg(null), 8000)
  }

  return (
    <AppShell>
      <PageHeader
        title="Gestión de usuarios"
        subtitle={`${users.length} usuario${users.length !== 1 ? 's' : ''} registrados`}
        action={
          me?.role === 'admin' ? (
            <button
              onClick={() => { setShowCreate(true); setCreateError('') }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Plus size={16} />
              Nuevo usuario
            </button>
          ) : undefined
        }
      />

      <div className="p-6 space-y-5">
        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-slate-900">Crear nuevo usuario</h2>
                <button onClick={() => setShowCreate(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre *</label>
                    <input
                      required
                      value={createForm.first_name}
                      onChange={(e) => setCreateForm(f => ({ ...f, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="Juan"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Apellido *</label>
                    <input
                      required
                      value={createForm.last_name}
                      onChange={(e) => setCreateForm(f => ({ ...f, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="Pérez"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Correo electrónico *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="usuario@empresa.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Rol *</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value as Role }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      <option value="reporter">Reporter</option>
                      <option value="agent">Agente</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Departamento</label>
                    <input
                      value={createForm.department}
                      onChange={(e) => setCreateForm(f => ({ ...f, department: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="TI, RRHH..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Contraseña temporal
                    <span className="ml-1 font-normal text-slate-400">(si vacío: Temporal123!)</span>
                  </label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <p className="text-xs text-slate-400 mt-1">El usuario deberá cambiarla en su primer acceso.</p>
                </div>

                {createError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">
                    <AlertCircle size={13} />
                    {createError}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {creating && <Spinner className="h-3.5 w-3.5 text-white" />}
                    {creating ? 'Creando...' : 'Crear usuario'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset password notification */}
        {resetMsg && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm">
            <CheckCircle2 size={15} className="flex-shrink-0" />
            <span>{resetMsg.msg}</span>
            <button onClick={() => setResetMsg(null)} className="ml-auto text-emerald-600 hover:text-emerald-800">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="h-7 w-7 text-indigo-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Departamento</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Último acceso</th>
                    {me?.role === 'admin' && (
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u.id} className={clsx('group hover:bg-slate-50/70 transition-colors', !u.active && 'opacity-60')}>
                      <td className="px-5 py-3.5">
                        {editingId === u.id ? (
                          <div className="flex gap-2">
                            <input
                              value={editForm.first_name}
                              onChange={(e) => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                              className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder="Nombre"
                            />
                            <input
                              value={editForm.last_name}
                              onChange={(e) => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                              className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder="Apellido"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {u.firstName[0]?.toUpperCase()}{u.lastName[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{u.firstName} {u.lastName}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {editingId === u.id ? (
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                          >
                            <option value="reporter">Reporter</option>
                            <option value="agent">Agente</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {editingId === u.id ? (
                          <input
                            value={editForm.department}
                            onChange={(e) => setEditForm(f => ({ ...f, department: e.target.value }))}
                            className="w-28 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Departamento"
                          />
                        ) : (
                          u.department ?? <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {u.active ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 size={13} />
                              Activo
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                              <XCircle size={13} />
                              Inactivo
                            </span>
                          )}
                          {u.forcePasswordChange && (
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                              clave temporal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {u.lastLogin
                          ? new Date(u.lastLogin).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-slate-300">Sin acceso</span>}
                      </td>
                      {me?.role === 'admin' && (
                        <td className="px-5 py-3.5">
                          {editingId === u.id ? (
                            <div className="flex items-center gap-1.5 justify-end">
                              {editError && <span className="text-xs text-red-500">{editError}</span>}
                              <button
                                onClick={() => handleSaveEdit(u.id)}
                                disabled={saving}
                                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                {saving ? <Spinner className="h-3 w-3" /> : <Check size={12} />}
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEdit(u)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleResetPassword(u)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Resetear contraseña"
                              >
                                <KeyRound size={13} />
                              </button>
                              {u.id !== me?.id && (
                                <button
                                  onClick={() => handleToggleActive(u)}
                                  className={clsx(
                                    'p-1.5 rounded-lg transition-colors',
                                    u.active
                                      ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                      : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                  )}
                                  title={u.active ? 'Desactivar' : 'Activar'}
                                >
                                  {u.active ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
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
