// src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
    pages?: number
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface FilterParams {
  status?: string
  dateFrom?: string
  dateTo?: string
  courseId?: string
  studentId?: string
  teacherId?: string
}