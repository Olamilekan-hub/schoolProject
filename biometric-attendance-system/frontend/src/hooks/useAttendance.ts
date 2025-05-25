// src/hooks/useAttendance.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceService } from '../services/attendance'
import type { 
//   AttendanceSession, 
  CreateAttendanceSessionData, 
  MarkAttendanceData,
//   AttendanceRecord 
} from '../types/attendance'
import toast from 'react-hot-toast'

// Fetch attendance sessions
export const useAttendanceSessions = (filters?: {
  courseId?: string
  status?: string
  date?: string
}) => {
  return useQuery({
    queryKey: ['attendance-sessions', filters],
    queryFn: () => attendanceService.getSessions(),
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Fetch single session
export const useAttendanceSession = (sessionId: string) => {
  return useQuery({
    queryKey: ['attendance-session', sessionId],
    queryFn: () => attendanceService.getSession(sessionId),
    enabled: !!sessionId,
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  })
}

// Fetch session records
export const useSessionRecords = (sessionId: string) => {
  return useQuery({
    queryKey: ['session-records', sessionId],
    queryFn: () => attendanceService.getSessionRecords(sessionId),
    enabled: !!sessionId,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  })
}

// Create attendance session
export const useCreateSession = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateAttendanceSessionData) => attendanceService.createSession(data),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] })
      toast.success('Attendance session created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create session')
    }
  })
}

// Update session
export const useUpdateSession = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAttendanceSessionData> }) => 
      attendanceService.updateSession(id, data),
    onSuccess: (updatedSession) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-session', updatedSession.id] })
      toast.success('Session updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update session')
    }
  })
}

// Update session status
export const useUpdateSessionStatus = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: string; status: 'OPEN' | 'CLOSED' | 'CANCELLED' }) => 
      attendanceService.updateSessionStatus(sessionId, status),
    onSuccess: (updatedSession) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-session', updatedSession.id] })
      toast.success('Session status updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update session status')
    }
  })
}

// Delete session
export const useDeleteSession = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (sessionId: string) => attendanceService.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] })
      toast.success('Session deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete session')
    }
  })
}

// Mark attendance
export const useMarkAttendance = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: MarkAttendanceData) => attendanceService.markAttendance(data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-records', variables.sessionId] })
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] })
      toast.success(result.message || 'Attendance marked successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark attendance')
    }
  })
}

// Mark bulk attendance
export const useMarkBulkAttendance = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ sessionId, studentIds }: { sessionId: string; studentIds: string[] }) => 
      attendanceService.markBulkAttendance(sessionId, studentIds),
    onSuccess: (results, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-records', variables.sessionId] })
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] })
      toast.success(`Marked attendance for ${results.length} students`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark bulk attendance')
    }
  })
}

// Generate attendance link
export const useGenerateAttendanceLink = () => {
  return useMutation({
    mutationFn: ({ sessionId, expiresInHours }: { sessionId: string; expiresInHours?: number }) => 
      attendanceService.generateAttendanceLink(sessionId, expiresInHours),
    onSuccess: () => {
      toast.success('Attendance link generated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate attendance link')
    }
  })
}

// Get attendance statistics
export const useAttendanceStats = (filters?: {
  courseId?: string
  dateFrom?: string
  dateTo?: string
}) => {
  return useQuery({
    queryKey: ['attendance-stats', filters],
    queryFn: () => attendanceService.getAttendanceStats(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get attendance trend
export const useAttendanceTrend = (days: number = 30) => {
  return useQuery({
    queryKey: ['attendance-trend', days],
    queryFn: () => attendanceService.getAttendanceTrend(days),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get student attendance history
export const useStudentAttendanceHistory = (studentId: string, courseId?: string) => {
  return useQuery({
    queryKey: ['student-attendance-history', studentId, courseId],
    queryFn: () => attendanceService.getStudentAttendanceHistory(studentId, courseId),
    enabled: !!studentId,
  })
}