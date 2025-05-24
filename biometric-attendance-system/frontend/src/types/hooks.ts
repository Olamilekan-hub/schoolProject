// src/types/hooks.ts
export interface UseApiOptions {
  enabled?: boolean
  refetchOnWindowFocus?: boolean
  refetchInterval?: number
  retry?: number
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}

export interface UseFormOptions<T = any> {
  initialValues?: Partial<T>
  validationSchema?: any
  onSubmit: (values: T) => void | Promise<void>
  enableReinitialize?: boolean
}

export interface UsePaginationOptions {
  initialPage?: number
  initialLimit?: number
  totalCount: number
}

export interface UsePaginationReturn {
  currentPage: number
  totalPages: number
  limit: number
  offset: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  nextPage: () => void
  previousPage: () => void
}

export interface UseDebounceOptions {
  delay?: number
  leading?: boolean
  trailing?: boolean
}