// src/types/system.ts

import type { User } from "./auth"
import type { AttendanceRecord, AttendanceSession } from "./attendance"
import type { Course } from "./course"

export interface SystemLog {
  id: string
  userId?: string
  action: string
  resourceType: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: string
  user?: User
}

export interface SystemStats {
  totalUsers: number
  totalStudents: number
  totalCourses: number
  totalSessions: number
  totalAttendanceRecords: number
  activeStudents: number
  enrolledBiometric: number
  todayAttendance: number
  attendanceRate: number
}

export interface DashboardData {
  stats: SystemStats
  recentAttendance: AttendanceRecord[]
  upcomingSessions: AttendanceSession[]
  lowAttendanceCourses: Course[]
  systemLogs: SystemLog[]
  attendanceTrend: { date: string; attendance: number }[]
  courseAttendance: any[]
}