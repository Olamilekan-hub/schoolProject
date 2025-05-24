import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

import { useAuth } from './AuthContext'

interface AppState {
  isOnline: boolean
  socket: Socket | null
  notifications: Notification[]
  theme: 'light' | 'dark'
  sidebarCollapsed: boolean
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
}

type AppAction =
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_SOCKET'; payload: Socket | null }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'TOGGLE_SIDEBAR' }

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
  toggleTheme: () => void
  toggleSidebar: () => void
}

const initialState: AppState = {
  isOnline: navigator.onLine,
  socket: null,
  notifications: [],
  theme: 'light',
  sidebarCollapsed: false,
}

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload }
    case 'SET_SOCKET':
      return { ...state, socket: action.payload }
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications]
      }
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        )
      }
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] }
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }
    default:
      return state
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const { isAuthenticated, user } = useAuth()

  // Setup WebSocket connection
  useEffect(() => {
    if (isAuthenticated && user) {
      const socket = io(import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:5000', {
        auth: {
          token: localStorage.getItem('accessToken'),
          userId: user.id,
        },
        transports: ['websocket', 'polling'],
      })

      socket.on('connect', () => {
        console.log('WebSocket connected')
        dispatch({ type: 'SET_SOCKET', payload: socket })
      })

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected')
        dispatch({ type: 'SET_SOCKET', payload: null })
      })

      // Listen for real-time attendance updates
      socket.on('attendance_marked', (data) => {
        addNotification({
          title: 'Attendance Marked',
          message: `${data.studentName} marked attendance for ${data.sessionName}`,
          type: 'success'
        })
      })

      // Listen for session updates
      socket.on('session_status_changed', (data) => {
        addNotification({
          title: 'Session Status Updated',
          message: `Session ${data.sessionName} is now ${data.status.toLowerCase()}`,
          type: 'info'
        })
      })

      return () => {
        socket.disconnect()
      }
    }
  }, [isAuthenticated, user])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true })
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false })

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      dispatch({ type: 'SET_THEME', payload: savedTheme })
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', state.theme)
  }, [state.theme])

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    }
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification })
  }

  const markNotificationRead = (id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id })
  }

  const clearNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' })
  }

  const toggleTheme = () => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light'
    dispatch({ type: 'SET_THEME', payload: newTheme })
  }

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' })
  }

  const value: AppContextType = {
    state,
    dispatch,
    addNotification,
    markNotificationRead,
    clearNotifications,
    toggleTheme,
    toggleSidebar,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
