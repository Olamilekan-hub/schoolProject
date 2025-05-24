// src/types/attendance.ts

import type { Course } from "./course"
import type { User } from "./auth"
import type { Student } from "./student"

export interface AttendanceSession {
  id: string
  courseId: string
  teacherId: string
  sessionName: string
  sessionDate: string
  startTime: string
  endTime?: string
  attendanceLinkToken?: string
  linkExpiresAt?: string
  allowRemoteMarking: boolean
  status: SessionStatus
  createdAt: string
  updatedAt: string
  course?: Course
  teacher?: User
  attendanceRecords?: AttendanceRecord[]
}

export type SessionStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';


export interface AttendanceRecord {
  id: string
  sessionId: string
  studentId: string
  markedAt: string
  status: AttendanceStatus
  verificationMethod: VerificationMethod
  biometricVerified: boolean
  verificationConfidence?: number
  ipAddress?: string
  userAgent?: string
  deviceInfo?: Record<string, any>
  markedById?: string
  remarks?: string
  session?: AttendanceSession
  student?: Student
  markedBy?: User
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'MANUAL' | 'LINK';

export interface CreateAttendanceSessionData {
  courseId: string
}

export type VerificationMethod = 'BIOMETRIC' | 'MANUAL' | 'LINK';

export interface MarkAttendanceData {
  sessionId: string
  studentId: string
  biometricData?: string
  verificationMethod?: VerificationMethod
  deviceInfo?: Record<string, any>
  remarks?: string
}

export interface AttendanceMarkingResult {
  success: boolean
  message: string
  studentName?: string
  sessionName?: string
  markedAt?: string
  confidenceScore?: number
  code?: string
}
