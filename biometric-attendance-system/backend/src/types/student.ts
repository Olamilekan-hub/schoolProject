// src/types/student.ts

import type { User } from "./auth"
import type { AttendanceRecord } from "./attendance"
import type { StudentCourse } from "./course"

export interface Student {
  id: string
  matricNumber: string
  firstName: string
  lastName: string
  middleName?: string
  email?: string
  phone?: string
  gender?: Gender
  dateOfBirth?: string
  level: string
  department?: string
  faculty?: string
  biometricTemplate?: string
  biometricEnrolled: boolean
  biometricEnrolledAt?: string
  status: StudentStatus
  registeredById: string
  createdAt: string
  updatedAt: string
  registeredBy?: User
  studentCourses?: StudentCourse[]
  attendanceRecords?: AttendanceRecord[]
}

export type Gender = 'MALE' | 'FEMALE';

export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'GRADUATED';

export interface CreateStudentData {
  matricNumber: string
  firstName: string
  lastName: string
  middleName?: string
  email?: string
  phone?: string
  gender?: Gender
  dateOfBirth?: string
  level?: string
  department?: string
  faculty?: string
  courseIds: string[]
}

export interface UpdateStudentData extends Partial<CreateStudentData> {
  id: string
  status?: StudentStatus
}

export interface BiometricEnrollmentData {
  studentId: string
  biometricData: string
  deviceInfo?: Record<string, any>
  qualityScore?: number
}