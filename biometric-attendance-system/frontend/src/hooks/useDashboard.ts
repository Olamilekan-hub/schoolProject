// src/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard'

export const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getDashboardData,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Data is fresh for 10 seconds
  })
}
