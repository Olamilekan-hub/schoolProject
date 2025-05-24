// src/types/course.ts

import type { Student } from "./student"
import type { AttendanceSession } from "./attendance"
import type { User } from "./auth"

export interface Course {
  id: string
  courseCode: string
  courseTitle: string
  description?: string
  creditUnits: number
  semester: string
  academicYear: string
  teacherId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  teacher?: User
  studentCourses?: StudentCourse[]
  attendanceSessions?: AttendanceSession[]
}

export interface StudentCourse {
  id: string
  studentId: string
  courseId: string
  enrollmentDate: string
  status: StudentCourseStatus
  student?: Student
  course?: Course
}
export const StudentCourseStatus = {
  ENROLLED: 'ENROLLED',
  DROPPED: 'DROPPED',
  COMPLETED: 'COMPLETED'
} as const;

export type StudentCourseStatus = typeof StudentCourseStatus[keyof typeof StudentCourseStatus];


export interface CreateCourseData {
  courseCode: string
  courseTitle: string
  description?: string
  creditUnits?: number
  semester?: string
  academicYear?: string
}

export interface UpdateCourseData extends Partial<CreateCourseData> {
  id: string
  isActive?: boolean
}