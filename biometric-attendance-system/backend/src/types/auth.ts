// src/types/auth.ts
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  department?: string
  employeeId?: string
  isActive: boolean
  role: UserRole
  createdAt: string
  updatedAt: string
}

export enum UserRole {
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  department?: string
  employeeId?: string
  registrationKey: string
  courses: string[]
}

export interface AuthResponse {
  success: boolean
  message: string
  data?: {
    user: User
    accessToken: string
    refreshToken: string
  }
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<AuthResponse>
  register: (data: RegisterData) => Promise<AuthResponse>
  logout: () => void
  refreshToken: () => Promise<boolean>
}