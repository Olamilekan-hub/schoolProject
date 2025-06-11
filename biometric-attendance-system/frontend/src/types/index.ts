// ================================
// UTILITY TYPES
// ================================

import type { SessionStatus, AttendanceStatus } from "./attendance"

// Generic utility types
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type Partial<T> = { [P in keyof T]?: T[P] }
export type Required<T> = { [P in keyof T]-?: T[P] }
export type Nullable<T> = T | null
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// API response wrapper
// Define ApiResponse type if not already defined or imported
export interface ApiResponse<T = any> {
  data: T
  message?: string
  status?: string
  error?: string
}

export type APIResponse<T = any> = Promise<ApiResponse<T>>

// Event handler types
export type EventHandler<T = any> = (event: T) => void
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>

// Form field types
export type FormFieldType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'time' | 'datetime-local'

// Status types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'
export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error'

// Biometric scanner states
export type ScannerState = 'idle' | 'scanning' | 'processing' | 'success' | 'error'

// File upload types
export interface FileUpload {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  url?: string
}

// Theme types
export interface Theme {
  colors: {
    primary: string
    secondary: string
    success: string
    error: string
    warning: string
    info: string
    background: string
    foreground: string
    muted: string
    border: string
  }
  fonts: {
    sans: string
    mono: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  breakpoints: {
    sm: string
    md: string
    lg: string
    xl: string
  }
}

// WebSocket message types
export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: number
  id?: string
}

export interface AttendanceUpdateMessage extends WebSocketMessage {
  type: 'ATTENDANCE_MARKED'
  payload: {
    sessionId: string
    studentId: string
    studentName: string
    status: AttendanceStatus
    timestamp: string
  }
}

export interface SessionUpdateMessage extends WebSocketMessage {
  type: 'SESSION_STATUS_CHANGED'
  payload: {
    sessionId: string
    status: SessionStatus
    timestamp: string
  }
}

// Search and filter types
export interface SearchOptions {
  query: string
  fields?: string[]
  fuzzy?: boolean
  limit?: number
}

export interface FilterOption {
  label: string
  value: string
  count?: number
}

export interface SortOption {
  label: string
  value: string
  direction: 'asc' | 'desc'
}

// Chart and analytics types
export interface ChartData {
  labels: string[]
  datasets: ChartDataset[]
}

export interface ChartDataset {
  label: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  borderWidth?: number
}

export interface AnalyticsData {
  metric: string
  value: number
  change?: number
  changeType?: 'increase' | 'decrease'
  period: string
}

// Error types
export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export interface AppError extends Error {
  code?: string
  status?: number
  details?: any
}

// Configuration types
export interface AppConfig {
  apiUrl: string
  websocketUrl: string
  environment: 'development' | 'production' | 'test'
  version: string
  features: {
    biometricAuth: boolean
    realTimeUpdates: boolean
    exportReports: boolean
    bulkImport: boolean
  }
  biometric: {
    confidenceThreshold: number
    maxRetries: number
    scanTimeout: number
  }
  session: {
    timeout: number
    extendOnActivity: boolean
  }
}

// Device information types
export interface DeviceInfo {
  userAgent: string
  platform: string
  browser: string
  version: string
  mobile: boolean
  tablet: boolean
  desktop: boolean
  screenSize: {
    width: number
    height: number
  }
  touchSupport: boolean
  biometricSupport: boolean
}

// Accessibility types
export interface A11yOptions {
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  role?: string
  tabIndex?: number
  focusable?: boolean
}

// Animation types
export interface AnimationOptions {
  duration?: number
  delay?: number
  easing?: string
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both'
  iterationCount?: number | 'infinite'
}

// Geolocation types (if needed for attendance verification)
export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export interface GeofenceOptions {
  center: {
    latitude: number
    longitude: number
  }
  radius: number
  unit: 'meters' | 'kilometers' | 'miles'
}

// Export all types
export * from './auth'
export * from './student'
export * from './course'
export * from './attendance'
export * from './biometric'
export * from './reports'
export * from './systems'