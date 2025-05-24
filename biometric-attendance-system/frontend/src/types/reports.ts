// src/types/reports.ts
export interface AttendanceReport {
  courseId: string
  courseName: string
  courseCode: string
  teacherName: string
  reportPeriod: {
    startDate: string
    endDate: string
  }
  statistics: {
    totalSessions: number
    totalStudents: number
    averageAttendance: number
    totalPossibleAttendances: number
  }
  sessions: AttendanceSessionSummary[]
  students: StudentAttendanceSummary[]
  totalSessions?: number
  totalStudents?: number
  totalRecords?: number
  averageAttendance?: number
  attendanceTrend?: [
    {
      date: string,
      attendance: number
    }, any
  ]
  courseComparison?: [any]
  studentDetails?: StudentAttendanceSummary[]
  sessionDetails?: AttendanceSessionSummary[]
  totalAttendance?: number
  exportOptions?: ExportOptions
}

export interface AttendanceSessionSummary {
  sessionId: string
  sessionName: string
  sessionDate: string
  totalMarked: number
  presentCount: number
  absentCount: number
  lateCount: number
  attendancePercentage: number
}

export interface StudentAttendanceSummary {
  studentId: string
  matricNumber: string
  studentName: string
  sessionsAttended: number
  totalSessions: number
  attendancePercentage: number
  presentCount: number
  lateCount: number
  absentCount: number
  lastAttendance?: string
}

export interface ExportOptions {
  format: 'PDF' | 'EXCEL' | 'CSV'
  dateRange: {
    startDate: string
    endDate: string
  }
  includeDetails: boolean
  courseIds?: string[]
  studentIds?: string[]
}
