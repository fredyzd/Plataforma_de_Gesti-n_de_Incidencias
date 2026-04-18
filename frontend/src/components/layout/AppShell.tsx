import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Plus,
  List,
  LogOut,
  Shield,
  BarChart3,
  ChevronRight,
  Users,
  Bell,
  Settings,
} from 'lucide-react'
import clsx from 'clsx'
import type { ReactNode } from 'react'

const ENV = import.meta.env.VITE_APP_ENV ?? 'qas'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  roles?: string[]
  exact?: boolean
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, exact: true },
  { to: '/incidents/new', label: 'Nueva incidencia', icon: <Plus size={16} /> },
  { to: '/incidents', label: 'Incidencias', icon: <List size={16} /> },
  { to: '/reports', label: 'Reportes', icon: <BarChart3 size={16} />, roles: ['agent', 'supervisor', 'admin'] },
  { to: '/users', label: 'Usuarios', icon: <Users size={16} />, roles: ['admin', 'supervisor'] },
  { to: '/notifications', label: 'Notificaciones', icon: <Bell size={16} />, roles: ['admin', 'supervisor'] },
  { to: '/settings', label: 'Configuración', icon: <Settings size={16} />, roles: ['admin', 'supervisor'] },
]

function isActive(item: NavItem, pathname: string) {
  if (item.exact) return pathname === item.to
  if (item.to === '/incidents') return pathname.startsWith('/incidents') && pathname !== '/incidents/new'
  return pathname.startsWith(item.to)
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role ?? '')
  )

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-slate-900 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-wide">PGI</span>
              <span
                className={clsx(
                  'ml-2 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest',
                  ENV === 'production'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                )}
              >
                {ENV === 'production' ? 'PROD' : 'QAS'}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => {
            const active = isActive(item, location.pathname)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={clsx(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                )}
              >
                <span className={clsx('flex-shrink-0', active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300')}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight size={12} className="text-indigo-300 flex-shrink-0" />}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-800 p-3">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1 hover:bg-slate-800 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[11px] text-slate-500 capitalize truncate">{user?.role}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
