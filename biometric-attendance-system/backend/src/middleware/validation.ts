// src/middleware/validation.ts - Request Validation
import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { logger } from '../utils/logger'

const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body)
    
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ')
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: message
      })
    }
    
    next()
  }
}

// Registration validation
export const validateRegister = validate(Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).required(),
  lastName: Joi.string().min(2).required(),
  phone: Joi.string().optional(),
  department: Joi.string().required(),
  employeeId: Joi.string().optional(),
  registrationKey: Joi.string().required(),
  courses: Joi.array().items(Joi.string()).optional()
}))

// Login validation
export const validateLogin = validate(Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
}))

// Student validation
export const validateStudent = validate(Joi.object({
  matricNumber: Joi.string().required(),
  firstName: Joi.string().min(2).required(),
  lastName: Joi.string().min(2).required(),
  middleName: Joi.string().optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  phone: Joi.string().optional().allow(''),
  gender: Joi.string().valid('MALE', 'FEMALE').optional(),
  dateOfBirth: Joi.string().optional().allow(''),
  level: Joi.string().default('100'),
  department: Joi.string().optional().allow(''),
  faculty: Joi.string().optional().allow(''),
  courseIds: Joi.array().items(Joi.string()).min(1).required()
}))

// Attendance session validation
export const validateAttendanceSession = validate(Joi.object({
  courseId: Joi.string().required(),
  sessionName: Joi.string().required(),
  sessionDate: Joi.string().required(),
  startTime: Joi.string().required(),
  endTime: Joi.string().optional().allow(''),
  allowRemoteMarking: Joi.boolean().default(false)
}))

// Mark attendance validation
export const validateMarkAttendance = validate(Joi.object({
  sessionId: Joi.string().required(),
  studentId: Joi.string().required(),
  biometricData: Joi.string().optional(),
  verificationMethod: Joi.string().valid('BIOMETRIC', 'MANUAL', 'LINK').default('MANUAL'),
  deviceInfo: Joi.object().optional(),
  remarks: Joi.string().optional().allow('')
}))

// danceRecord.create({
//       data: {
//         sessionId,
//         studentId,
//         status: 'PRESENT',
//         verificationMethod,
//         biometricVerified: !!biometricData,
//         verificationConfidence: biometricData ? Math.random() * 20 + 80 : null, // Mock confidence
//         ipAddress: req.ip,
//         userAgent: req.get('User-Agent'),
//         deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
//         markedById: req.user!.id,
//         remarks
//       },
//       include: {
//         student: true,
//         session: {
//           include: {
//             course: true
//           }
//         }
//       }
//     })

//     // Emit real-time update
//     const io = req.app.get('io')
//     io.to(`session-${sessionId}`).emit('attendance_marked', {
//       studentId,
//       studentName: `${student.firstName} ${student.lastName}`,
//       sessionId,
//       timestamp: attendanceRecord.markedAt
//     })

//     logger.info(`Attendance marked: ${student.matricNumber} for session ${sessionId}`)

//     res.json({
//       success: true,
//       message: `Attendance marked successfully for ${student.firstName} ${student.lastName}`,
//       data: attendanceRecord
//     })
//   } catch (error) {
//     logger.error('Mark attendance error:', error)
//     res.status(500).json({
//       success: false,
//       message: 'Failed to mark attendance'
//     })
//   }
// })

// // Mark attendance via link (public route)
// router.post('/mark-by-link/:token', async (req, res) => {
//   try {
//     const { token } = req.params
//     const { studentId, biometricData, verificationMethod = 'LINK' } = req.body

//     // Find session by token
//     const session = await prisma.attendanceSession.findFirst({
//       where: {
//         attendanceLinkToken: token,
//         status: 'OPEN',
//         linkExpiresAt: {
//           gt: new Date()
//         }
//       },
//       include: {
//         course: true
//       }
//     })

//     if (!session) {
//       return res.status(404).json({
//         success: false,
//         message: 'Invalid or expired attendance link'
//       })
//     }

//     // Check if student exists and is enrolled in course
//     const student = await prisma.student.findFirst({
//       where: {
//         id: studentId,
//         studentCourses: {
//           some: {
//             courseId: session.courseId
//           }
//         }
//       }
//     })

//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: 'Student not found or not enrolled in this course'
//       })
//     }

//     // Check if attendance already marked
//     const existingRecord = await prisma.attendanceRecord.findUnique({
//       where: {
//         sessionId_studentId: {
//           sessionId: session.id,
//           studentId
//         }
//       }
//     })

//     if (existingRecord) {
//       return res.status(400).json({
//         success: false,
//         message: 'Attendance already marked'
//       })
//     }

//     // Mark attendance
//     const attendanceRecord = await prisma.atten