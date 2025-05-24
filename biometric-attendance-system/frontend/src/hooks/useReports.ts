// src/hooks/useReports.ts
import { useQuery } from '@tanstack/react-query'
import { reportsService } from '../services/reports'

interface UseReportsOptions {
  startDate: string
  endDate: string
  courseId?: string
}

export const useAttendanceReports = (options: UseReportsOptions) => {
  return useQuery({
    queryKey: ['attendance-reports', options],
    queryFn: () => reportsService.getAttendanceReport(options),
  })
}
