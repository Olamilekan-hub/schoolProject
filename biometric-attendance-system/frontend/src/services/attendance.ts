// src/services/api/attendance.ts - Frontend Attendance Service
import axios from 'axios'
import type { 
  AttendanceSession, 
  CreateAttendanceSessionData, 
  MarkAttendanceData,
  AttendanceRecord,
  AttendanceMarkingResult 
} from '../types/attendance'

const API_URL = import.meta.env.VITE_API_URL

const attendanceService = {
  // Session Management
  getSessions: async (): Promise<AttendanceSession[]> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/api/attendance/sessions`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  getSession: async (id: string): Promise<AttendanceSession> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/api/attendance/sessions/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  getSessionByToken: async (token: string): Promise<AttendanceSession> => {
    const response = await axios.get(`${API_URL}/api/attendance/sessions/by-token/${token}`)
    return response.data.data
  },

  createSession: async (data: CreateAttendanceSessionData): Promise<AttendanceSession> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.post(`${API_URL}/api/attendance/sessions`, data, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  updateSession: async (id: string, data: Partial<CreateAttendanceSessionData>): Promise<AttendanceSession> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.put(`${API_URL}/api/attendance/sessions/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  updateSessionStatus: async (sessionId: string, status: 'OPEN' | 'CLOSED' | 'CANCELLED'): Promise<AttendanceSession> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.patch(`${API_URL}/api/attendance/sessions/${sessionId}/status`, 
      { status }, 
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data
  },

  deleteSession: async (id: string): Promise<void> => {
    const token = localStorage.getItem('accessToken')
    await axios.delete(`${API_URL}/api/attendance/sessions/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  },

  // Attendance Records
  getSessionRecords: async (sessionId: string): Promise<AttendanceRecord[]> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/api/attendance/sessions/${sessionId}/records`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  getAttendanceRecords: async (filters?: {
    sessionId?: string
    studentId?: string
    dateFrom?: string
    dateTo?: string
    courseId?: string
  }): Promise<AttendanceRecord[]> => {
    const token = localStorage.getItem('accessToken')
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    
    const response = await axios.get(`${API_URL}/api/attendance/records?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  // Mark Attendance
  markAttendance: async (data: MarkAttendanceData): Promise<AttendanceMarkingResult> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.post(`${API_URL}/api/attendance/mark`, data, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  markAttendanceByLink: async (token: string, data: Omit<MarkAttendanceData, 'sessionId'>): Promise<AttendanceMarkingResult> => {
    const response = await axios.post(`${API_URL}/api/attendance/mark-by-link/${token}`, data)
    return response.data.data
  },

  markBulkAttendance: async (sessionId: string, studentIds: string[]): Promise<AttendanceMarkingResult[]> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.post(`${API_URL}/api/attendance/mark-bulk`, {
      sessionId,
      studentIds
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  updateAttendanceRecord: async (id: string, data: {
    status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
    remarks?: string
  }): Promise<AttendanceRecord> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.patch(`${API_URL}/api/attendance/records/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  deleteAttendanceRecord: async (id: string): Promise<void> => {
    const token = localStorage.getItem('accessToken')
    await axios.delete(`${API_URL}/api/attendance/records/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  },

  // Attendance Links
  generateAttendanceLink: async (sessionId: string, expiresInHours: number = 24): Promise<{ 
    link: string
    token: string
    expiresAt: string
  }> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.post(`${API_URL}/api/attendance/sessions/${sessionId}/generate-link`, {
      expiresInHours
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  getAttendanceLinkInfo: async (token: string): Promise<{
    session: AttendanceSession
    isValid: boolean
    expiresAt: string
  }> => {
    const response = await axios.get(`${API_URL}/api/attendance/link-info/${token}`)
    return response.data.data
  },

  disableAttendanceLink: async (sessionId: string): Promise<void> => {
    const token = localStorage.getItem('accessToken')
    await axios.delete(`${API_URL}/api/attendance/sessions/${sessionId}/link`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  },

  // Statistics and Analytics
  getAttendanceStats: async (filters?: {
    courseId?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<{
    totalSessions: number
    totalAttendance: number
    averageAttendance: number
    attendanceRate: number
    topPerformers: Array<{
      studentId: string
      studentName: string
      attendanceRate: number
    }>
    lowPerformers: Array<{
      studentId: string
      studentName: string
      attendanceRate: number
    }>
  }> => {
    const token = localStorage.getItem('accessToken')
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    
    const response = await axios.get(`${API_URL}/api/attendance/stats?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  getAttendanceTrend: async (days: number = 30): Promise<Array<{
    date: string
    sessions: number
    attendance: number
    rate: number
  }>> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/api/attendance/trend?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  // Export Functions
  exportAttendanceReport: async (sessionId: string, format: 'PDF' | 'EXCEL' | 'CSV' = 'EXCEL'): Promise<Blob> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/api/attendance/sessions/${sessionId}/export?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    })
    return response.data
  },

  exportAllAttendance: async (filters: {
    courseId?: string
    dateFrom?: string
    dateTo?: string
    format?: 'PDF' | 'EXCEL' | 'CSV'
  } = {}): Promise<Blob> => {
    const token = localStorage.getItem('accessToken')
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })
    
    const response = await axios.get(`${API_URL}/api/attendance/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    })
    return response.data
  },

  // Validation and Utilities
  validateAttendanceTime: async (sessionId: string): Promise<{
    isValid: boolean
    message: string
    timeRemaining?: number
  }> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/api/attendance/sessions/${sessionId}/validate-time`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  getStudentAttendanceHistory: async (studentId: string, courseId?: string): Promise<{
    student: {
      id: string
      name: string
      matricNumber: string
    }
    records: AttendanceRecord[]
    statistics: {
      totalSessions: number
      attendedSessions: number
      attendanceRate: number
      lastAttendance?: string
    }
  }> => {
    const token = localStorage.getItem('accessToken')
    const params = new URLSearchParams()
    if (courseId) params.append('courseId', courseId)
    
    const response = await axios.get(`${API_URL}/api/attendance/students/${studentId}/history?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  }
}

export { attendanceService }