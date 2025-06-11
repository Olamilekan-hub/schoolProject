import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Menu, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Fingerprint,
  ChevronDown 
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import Button from '../UI/Button'
import { formatDistanceToNow } from 'date-fns'

interface HeaderProps {
  onMenuClick: () => void
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  // Mock notifications data
  const notifications = [
    {
      id: '1',
      title: 'New Student Enrolled',
      message: 'John Doe has been successfully enrolled in CSC101',
      time: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      read: false,
      type: 'info'
    },
    {
      id: '2',
      title: 'Attendance Session Active',
      message: 'CSC101 - Introduction to Programming session is now active',
      time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: true,
      type: 'success'
    },
    {
      id: '3',
      title: 'Low Attendance Alert',
      message: 'CSC201 has attendance below 70% this week',
      time: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      read: false,
      type: 'warning'
    }
  ]

  const unreadCount = notifications.filter(n => !n.read).length

  const handleLogout = async () => {
    await logout()
    setShowUserMenu(false)
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm lg:pl-56">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-600 rounded-lg lg:hidden hover:text-gray-900 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Logo and title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-semibold text-gray-900">
                Attendance System
              </h1>
              <p className="text-sm text-gray-500">Biometric Management</p>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 rounded-lg hover:text-gray-900 hover:bg-gray-100"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute flex items-center justify-center w-5 h-5 text-xs text-white bg-red-500 rounded-full -top-1 -right-1">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg w-80">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="overflow-y-auto max-h-96">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'success' ? 'bg-success-500' :
                            notification.type === 'warning' ? 'bg-warning-500' :
                            notification.type === 'error' ? 'bg-error-500' :
                            'bg-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              {notification.message}
                            </p>
                            <p className="mt-2 text-xs text-gray-500">
                              {formatDistanceToNow(notification.time)} ago
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-gray-200">
                  <button className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center p-2 space-x-3 text-gray-600 rounded-lg hover:text-gray-900 hover:bg-gray-100"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role.toLowerCase()}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 z-50 w-56 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-4 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <p className="mt-1 text-xs text-gray-400 capitalize">
                    {user?.role.toLowerCase()} • {user?.department}
                  </p>
                </div>
                
                <div className="py-2">
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 space-x-3 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                  
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 space-x-3 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                </div>
                
                <div className="py-2 border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 space-x-3 text-sm text-left text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
