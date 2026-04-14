import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Plus,
  List,
  LogOut,
  Shield,
  BarChart3,
} from 'lucide-react'
import clsx from 'clsx'
import type { ReactNode } from 'react'

const ENV = import.meta.env.VITE_APP_ENV ?? 'qas'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  roles?: string[]
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/incidents/new', label: 'Nueva incidencia', icon: <Plus size={18} />, roles: ['reporter'] },
  { to: '/incidents', label: 'Incidencias', icon: <List size={18} /> },
  { to: '/reports', label: 'Reportes', icon: <BarChart3 size={18} />, roles: ['agent', 'supervisor', 'admin'] },
]

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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo + env badge */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-blue-600" />
            <span className="font-semibold text-gray-900 text-sm">PGI</span>
          </div>
          <span
            className={clsx(
              'mt-1 inline-block text-xs font-bold px-2 py-0.5 rounded uppercase tracking-widest',
              ENV === 'production'
                ? 'bg-green-100 text-green-800'
                : 'bg-amber-100 text-amber-800'
            )}
          >
            {ENV === 'production' ? 'PROD' : 'QAS'}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                location.pathname.startsWith(item.to) && item.to !== '/dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : location.pathname === item.to
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-200 px-3 py-3 space-y-1">
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.first_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut size={14} />
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

// Header dentro de cada página
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
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
