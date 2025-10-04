// src/services/reports.ts
import axios from 'axios'
import type { AttendanceReport, ExportOptions } from '../types/reports'

const API_URL = import.meta.env.VITE_API_URL

interface ReportOptions {
  startDate: string
  endDate: string
  courseId?: string
}

const reportsService = {
  getAttendanceReport: async (options: ReportOptions): Promise<AttendanceReport> => {
    const token = localStorage.getItem('accessToken')
    const params = new URLSearchParams()
    
    Object.entries(options).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })
    
    const response = await axios.get(`${API_URL}/api/reports/attendance?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // Mock data for now
    return {
      courseId: options.courseId || '',
      courseName: 'All Courses',
      courseCode: 'ALL',
      teacherName: 'Teacher Name',
      reportPeriod: {
        startDate: options.startDate,
        endDate: options.endDate
      },
      statistics: {
        totalSessions: 45,
        totalStudents: 120,
        averageAttendance: 78.5,
        totalPossibleAttendances: 5400
      },
      sessions: [],
      students: [],
      totalStudents: 120,
      totalSessions: 45,
      totalRecords: 4230,
      averageAttendance: 78.5,
      attendanceTrend: [
        { date: '2024-01-01', attendance: 75 },
        { date: '2024-01-02', attendance: 82 },
        { date: '2024-01-03', attendance: 78 },
        { date: '2024-01-04', attendance: 85 },
        { date: '2024-01-05', attendance: 79 },
      ],
      courseComparison: [
        { courseCode: 'CSC101', percentage: 85 },
        { courseCode: 'CSC201', percentage: 72 },
        { courseCode: 'MTH101', percentage: 68 },
      ],
      studentDetails: [],
      sessionDetails: []
    }
  },

  exportReport: async (options: ExportOptions): Promise<Blob> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.post(`${API_URL}/api/reports/export`, options, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    })
    return response.data
  }
}

export { reportsService }