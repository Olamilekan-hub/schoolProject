// src/utils/attendance.ts - Attendance Utilities
import { randomBytes } from 'crypto'

export const generateAttendanceLink = (): string => {
  return randomBytes(32).toString('hex')
}

export const isValidAttendanceTime = (sessionStart: Date, sessionEnd: Date | null): boolean => {
  const now = new Date()
  const startTime = new Date(sessionStart)
  
  // Allow attendance 15 minutes before session starts
  const allowedStart = new Date(startTime.getTime() - 15 * 60 * 1000)
  
  if (now < allowedStart) {
    return false
  }
  
  if (sessionEnd) {
    const endTime = new Date(sessionEnd)
    // Allow attendance 30 minutes after session ends
    const allowedEnd = new Date(endTime.getTime() + 30 * 60 * 1000)
    
    if (now > allowedEnd) {
      return false
    }
  }
  
  return true
}