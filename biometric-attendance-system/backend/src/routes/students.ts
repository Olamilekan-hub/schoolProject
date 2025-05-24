// src/routes/students.ts - Student Management Routes
import express from 'express'
import { prisma } from '../config/database'
import { authenticate, authorize } from '../middleware/auth'
import { validateStudent } from '../middleware/validation'
import { logger } from '../utils/logger'

const router = express.Router()

// Get all students
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, courseId, status, page = 1, limit = 50 } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    
    const where: any = {}
    
    // Add search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { matricNumber: { contains: search as string, mode: 'insensitive' } }
      ]
    }
    
    // Add status filter
    if (status) {
      where.status = status
    }
    
    // Add course filter
    if (courseId) {
      where.studentCourses = {
        some: {
          courseId: courseId as string
        }
      }
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        studentCourses: {
          include: {
            course: true
          }
        },
        registeredBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: 'desc'
      }
    })

    const total = await prisma.student.count({ where })

    res.json({
      success: true,
      data: students,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    logger.error('Get students error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students'
    })
  }
})

// Get single student
router.get('/:id', authenticate, async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        studentCourses: {
          include: {
            course: true
          }
        },
        attendanceRecords: {
          include: {
            session: {
              include: {
                course: true
              }
            }
          },
          orderBy: {
            markedAt: 'desc'
          },
          take: 10
        }
      }
    })

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      })
    }

    res.json({
      success: true,
      data: student
    })
  } catch (error) {
    logger.error('Get student error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student'
    })
  }
})

// Create student
router.post('/', authenticate, validateStudent, async (req, res) => {
  try {
    const {
      matricNumber,
      firstName,
      lastName,
      middleName,
      email,
      phone,
      gender,
      dateOfBirth,
      level,
      department,
      faculty,
      courseIds
    } = req.body

    // Check if matric number already exists
    const existingStudent = await prisma.student.findUnique({
      where: { matricNumber }
    })

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student with this matric number already exists'
      })
    }

    // Create student with courses
    const student = await prisma.$transaction(async (tx) => {
      const newStudent = await tx.student.create({
        data: {
          matricNumber,
          firstName,
          lastName,
          middleName,
          email,
          phone,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          level,
          department,
          faculty,
          registeredById: req.user!.id
        }
      })

      // Enroll in courses
      if (courseIds && courseIds.length > 0) {
        await tx.studentCourse.createMany({
          data: courseIds.map((courseId: string) => ({
            studentId: newStudent.id,
            courseId
          }))
        })
      }

      return newStudent
    })

    // Fetch complete student data
    const completeStudent = await prisma.student.findUnique({
      where: { id: student.id },
      include: {
        studentCourses: {
          include: {
            course: true
          }
        }
      }
    })

    logger.info(`New student created: ${matricNumber}`)

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: completeStudent
    })
  } catch (error) {
    logger.error('Create student error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create student'
    })
  }
})

// Update student
router.put('/:id', authenticate, validateStudent, async (req, res) => {
  try {
    const { courseIds, ...updateData } = req.body

    const student = await prisma.$transaction(async (tx) => {
      // Update student
      const updatedStudent = await tx.student.update({
        where: { id: req.params.id },
        data: {
          ...updateData,
          dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null
        }
      })

      // Update course enrollments if provided
      if (courseIds) {
        // Remove existing enrollments
        await tx.studentCourse.deleteMany({
          where: { studentId: req.params.id }
        })

        // Add new enrollments
        if (courseIds.length > 0) {
          await tx.studentCourse.createMany({
            data: courseIds.map((courseId: string) => ({
              studentId: req.params.id,
              courseId
            }))
          })
        }
      }

      return updatedStudent
    })

    // Fetch complete student data
    const completeStudent = await prisma.student.findUnique({
      where: { id: student.id },
      include: {
        studentCourses: {
          include: {
            course: true
          }
        }
      }
    })

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: completeStudent
    })
  } catch (error) {
    logger.error('Update student error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update student'
    })
  }
})

// Delete student
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.student.delete({
      where: { id: req.params.id }
    })

    res.json({
      success: true,
      message: 'Student deleted successfully'
    })
  } catch (error) {
    logger.error('Delete student error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete student'
    })
  }
})

export default router