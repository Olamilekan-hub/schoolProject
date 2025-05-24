// src/types/routes.ts

export type UserRole = 'admin' | 'user' | 'guest' | 'student' | 'teacher'

export interface RouteConfig {
  path: string
  component: React.ComponentType
  exact?: boolean
  protected?: boolean
  roles?: UserRole[]
  title?: string
  breadcrumb?: string
}

export interface NavigationItem {
  id: string
  label: string
  path?: string
  icon?: React.ComponentType
  children?: NavigationItem[]
  roles?: UserRole[]
  badge?: string | number
  external?: boolean
}