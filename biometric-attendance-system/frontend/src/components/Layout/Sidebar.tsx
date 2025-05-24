import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  X, 
  BarChart3, 
  Users, 
  UserCheck, 
  FileText, 
  User,
  Fingerprint,
  Calendar,
  Settings,
  HelpCircle
} from 'lucide-react'
import { clsx } from 'clsx'

import { useAuth } from '../../context/AuthContext'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  description?: string
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const location = useLocation()

  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      description: 'Overview and statistics'
    },
    {
      name: 'Students',
      href: '/students',
      icon: Users,
      description: 'Manage student records'
    },
    {
      name: 'Attendance',
      href: '/attendance',
      icon: UserCheck,
      description: 'Mark and view attendance'
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FileText,
      description: 'Generate attendance reports'
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      description: 'Your account settings'
    },
  ]

  const secondaryNavigation: NavItem[] = [
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      description: 'App preferences'
    },
    {
      name: 'Help & Support',
      href: '/help',
      icon: HelpCircle,
      description: 'Get help and support'
    },
  ]

  const isCurrentPath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <>
      {/* Sidebar */}
      <div
        className={clsx(
          'sidebar',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  BiometricAMS
                </h2>
                <p className="text-xs text-gray-400">Attendance Management</p>
              </div>
            </div>
            
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User info */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gray-600 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.email}
                </p>
                <div className="flex items-center mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-900 text-primary-200 capitalize">
                    {user?.role.toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-6 space-y-1 overflow-y-auto">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const current = isCurrentPath(item.href)
                
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200',
                        isActive || current
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      )
                    }
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    <div className="flex-1">
                      <div>{item.name}</div>
                      {item.description && (
                        <div className="text-xs opacity-75 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                    {item.badge && (
                      <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </nav>

          {/* Secondary navigation */}
          <div className="border-t border-gray-700 p-6">
            <div className="space-y-1">
              {secondaryNavigation.map((item) => {
                const Icon = item.icon
                const current = isCurrentPath(item.href)
                
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                        isActive || current
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      )
                    }
                  >
                    <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 p-4">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                BiometricAMS v1.0.0
              </p>
              <p className="text-xs text-gray-600 mt-1">
                © 2024 Your Institution
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
