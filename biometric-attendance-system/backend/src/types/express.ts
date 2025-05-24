// src/types/express.ts (Backend)
import { Request, Response } from 'express'
import { User } from './auth'

export interface AuthenticatedRequest extends Request {
  user?: User
  token?: string
}

export interface ApiError {
  status: number
  message: string
  code?: string
  details?: any
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}