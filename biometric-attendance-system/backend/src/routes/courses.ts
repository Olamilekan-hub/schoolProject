// src/routes/courses.ts - Backend Course Routes
import express from "express";
import { prisma } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";
import { logger } from "../utils/logger";
import Joi from "joi";

const router = express.Router();

// Validation schemas
const createCourseSchema = Joi.object({
  courseCode: Joi.string().required(),
  courseTitle: Joi.string().required(),
  description: Joi.string().optional(),
  creditUnits: Joi.number().integer().min(1).max(6).default(3),
  semester: Joi.string().valid("FIRST", "SECOND").default("FIRST"),
  academicYear: Joi.string()
    .pattern(/^\d{4}\/\d{4}$/)
    .default("2024/2025"),
});

const updateCourseSchema = Joi.object({
  courseCode: Joi.string().optional(),
  courseTitle: Joi.string().optional(),
  description: Joi.string().optional(),
  creditUnits: Joi.number().integer().min(1).max(6).optional(),
  semester: Joi.string().valid("FIRST", "SECOND").optional(),
  academicYear: Joi.string()
    .pattern(/^\d{4}\/\d{4}$/)
    .optional(),
  isActive: Joi.boolean().optional(),
});

// Get all courses for authenticated teacher
router.get("/", authenticate, async (req, res) => {
  try {
    const { search, semester, academicYear, isActive } = req.query;

    const where: any = {
      teacherId: (req as any).user.id,
    };

    if (search) {
      where.OR = [
        { courseCode: { contains: search as string, mode: "insensitive" } },
        { courseTitle: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (semester) where.semester = semester;
    if (academicYear) where.academicYear = academicYear;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const courses = await prisma.course.findMany({
      where,
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        studentCourses: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                matricNumber: true,
                status: true,
                biometricEnrolled: true,
              },
            },
          },
        },
        attendanceSessions: {
          select: {
            id: true,
            sessionName: true,
            sessionDate: true,
            status: true,
          },
          orderBy: {
            sessionDate: "desc",
          },
          take: 5,
        },
      },
      orderBy: {
        courseCode: "asc",
      },
    });

    res.json({
      success: true,
      data: courses.map((course) => ({
        ...course,
        enrolledStudents: course.studentCourses.length,
        activeStudents: course.studentCourses.filter(
          (sc) => sc.student.status === "ACTIVE"
        ).length,
        totalSessions: course.attendanceSessions.length,
      })),
    });
  } catch (error) {
    logger.error("Get courses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
    });
  }
});

// Get single course
router.get("/:id", authenticate, async (req, res) => {
  try {
    // Fetch course with relations
    const course = await prisma.course.findFirst({
      where: {
        id: req.params.id,
        teacherId: (req as any).user.id,
      },
      include: {
        studentCourses: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                matricNumber: true,
                status: true,
                biometricEnrolled: true,
              },
            },
          },
        },
        attendanceSessions: {
          include: {
            attendanceRecords: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Calculate statistics
    const totalStudents = course.studentCourses.length;
    const totalSessions = course.attendanceSessions.length;
    const totalAttendanceRecords = course.attendanceSessions.reduce(
      (sum, session) => sum + session.attendanceRecords.length,
      0
    );
    const averageAttendance =
      totalSessions > 0 && totalStudents > 0
        ? Math.round(
            (totalAttendanceRecords / (totalSessions * totalStudents)) * 100
          )
        : 0;
    // Defensive: check for biometricEnrolled property using Object.prototype.hasOwnProperty
    const activeStudents = course.studentCourses.filter(
      (sc) => sc.student && sc.student.status === "ACTIVE"
    ).length;
    const biometricEnrolled = course.studentCourses.filter(
      (sc) => sc.student && Object.prototype.hasOwnProperty.call(sc.student, 'biometricEnrolled') && sc.student.biometricEnrolled === true
    ).length;

    res.json({
      success: true,
      data: {
        ...course,
        statistics: {
          totalStudents,
          totalSessions,
          totalAttendanceRecords,
          averageAttendance,
          activeStudents,
          biometricEnrolled,
        },
      },
    });
  } catch (error) {
    logger.error("Get course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch course",
    });
  }
});

// Create course
router.post("/", authenticate, async (req, res) => {
  try {
    const { error, value } = createCourseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Check if course code already exists for this teacher
    const existingCourse = await prisma.course.findFirst({
      where: {
        courseCode: value.courseCode,
        teacherId: (req as any).user.id,
      },
    });

    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: "Course with this code already exists",
      });
    }

    const course = await prisma.course.create({
      data: {
        ...value,
        teacherId: (req as any).user.id,
      },
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(
      `New course created: ${course.courseCode} by ${(req as any).user.email}`
    );

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
  } catch (error) {
    logger.error("Create course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create course",
    });
  }
});

// Update course
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { error, value } = updateCourseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Check if course exists and belongs to teacher
    const existingCourse = await prisma.course.findFirst({
      where: {
        id: req.params.id,
        teacherId: (req as any).user.id,
      },
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if new course code conflicts (if being updated)
    if (value.courseCode && value.courseCode !== existingCourse.courseCode) {
      const conflictingCourse = await prisma.course.findFirst({
        where: {
          courseCode: value.courseCode,
          teacherId: (req as any).user.id,
          id: { not: req.params.id },
        },
      });

      if (conflictingCourse) {
        return res.status(400).json({
          success: false,
          message: "Course with this code already exists",
        });
      }
    }

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: value,
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        studentCourses: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                matricNumber: true,
                status: true,
                biometricEnrolled: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Course updated: ${course.courseCode} by ${(req as any).user.email}`);

    res.json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    logger.error("Update course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update course",
    });
  }
});

// Delete course
router.delete("/:id", authenticate, async (req, res) => {
  try {
    // Check if course exists and belongs to teacher
    const course = await prisma.course.findFirst({
      where: {
        id: req.params.id,
        teacherId: (req as any).user.id,
      },
      include: {
        attendanceSessions: true,
        studentCourses: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                matricNumber: true,
                status: true,
                biometricEnrolled: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if course has attendance sessions
    if (course.attendanceSessions.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete course with existing attendance sessions. Please delete sessions first or mark course as inactive.",
      });
    }

    // Delete course (this will cascade delete student enrollments)
    await prisma.course.delete({
      where: { id: req.params.id },
    });

    logger.info(`Course deleted: ${course.courseCode} by ${(req as any).user.email}`);

    res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    logger.error("Delete course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete course",
    });
  }
});

// Get course enrollment statistics
router.get("/:id/stats", authenticate, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const course = await prisma.course.findFirst({
      where: {
        id: req.params.id,
        teacherId: (req as any).user.id,
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Build date filter
    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      dateFilter.sessionDate = {};
      if (dateFrom) dateFilter.sessionDate.gte = new Date(dateFrom as string);
      if (dateTo) dateFilter.sessionDate.lte = new Date(dateTo as string);
    }

    // Get statistics
    const [
      totalStudents,
      activeStudents,
      biometricEnrolled,
      totalSessions,
      activeSessions,
      totalAttendance,
      averageAttendancePerSession,
    ] = await Promise.all([
      prisma.studentCourse.count({
        where: { courseId: req.params.id },
      }),
      prisma.studentCourse.count({
        where: {
          courseId: req.params.id,
          student: { status: "ACTIVE" },
        },
      }),
      prisma.studentCourse.findMany({
        where: {
          courseId: req.params.id,
        },
        include: {
          student: {
            select: {
              biometricEnrolled: true,
            },
          },
        },
      }).then((studentCourses) => studentCourses.filter(
        (sc) => sc.student && sc.student.biometricEnrolled
      ).length),
      prisma.attendanceSession.count({
        where: {
          courseId: req.params.id,
          ...dateFilter,
        },
      }),
      prisma.attendanceSession.count({
        where: {
          courseId: req.params.id,
          status: "OPEN",
          ...dateFilter,
        },
      }),
      prisma.attendanceRecord.count({
        where: {
          session: {
            courseId: req.params.id,
            ...dateFilter,
          },
        },
      }),
      prisma.attendanceSession
        .findMany({
          where: {
            courseId: req.params.id,
            ...dateFilter,
          },
          include: {
            attendanceRecords: true,
          },
        })
        .then((sessions) => {
          if (sessions.length === 0) return 0;
          const totalRecords = sessions.reduce(
            (sum, session) => sum + session.attendanceRecords.length,
            0
          );
          return Math.round(totalRecords / sessions.length);
        }),
    ]);

    // Get attendance trend
    const attendanceTrend = await prisma.$queryRaw`
      SELECT 
        DATE(ar.marked_at) as date,
        COUNT(ar.id) as attendance_count
      FROM attendance_records ar
      JOIN attendance_sessions ats ON ar.session_id = ats.id
      WHERE ats.course_id = ${req.params.id}
        ${dateFrom ? `AND ar.marked_at >= ${new Date(dateFrom as string)}` : ""}
        ${dateTo ? `AND ar.marked_at <= ${new Date(dateTo as string)}` : ""}
      GROUP BY DATE(ar.marked_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
        },
        statistics: {
          totalStudents,
          activeStudents,
          biometricEnrolled,
          totalSessions,
          activeSessions,
          totalAttendance,
          averageAttendancePerSession,
          attendanceRate:
            totalSessions > 0 && totalStudents > 0
              ? Math.round(
                  (totalAttendance / (totalSessions * totalStudents)) * 100
                )
              : 0,
        },
        attendanceTrend,
      },
    });
  } catch (error) {
    logger.error("Get course stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch course statistics",
    });
  }
});

// Enroll students in course
router.post("/:id/enroll", authenticate, async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Student IDs array is required",
      });
    }

    // Check if course exists and belongs to teacher
    const course = await prisma.course.findFirst({
      where: {
        id: req.params.id,
        teacherId: (req as any).user.id,
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check which students are already enrolled
    const existingEnrollments = await prisma.studentCourse.findMany({
      where: {
        courseId: req.params.id,
        studentId: { in: studentIds },
      },
    });

    const alreadyEnrolledIds = existingEnrollments.map((e) => e.studentId);
    const newEnrollmentIds = studentIds.filter(
      (id) => !alreadyEnrolledIds.includes(id)
    );

    if (newEnrollmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All selected students are already enrolled in this course",
      });
    }

    // Create new enrollments
    await prisma.studentCourse.createMany({
      data: newEnrollmentIds.map((studentId) => ({
        studentId,
        courseId: req.params.id,
      })),
    });

    logger.info(
      `${newEnrollmentIds.length} students enrolled in course ${course.courseCode}`
    );

    res.json({
      success: true,
      message: `Successfully enrolled ${newEnrollmentIds.length} students`,
      data: {
        enrolledCount: newEnrollmentIds.length,
        alreadyEnrolledCount: alreadyEnrolledIds.length,
      },
    });
  } catch (error) {
    logger.error("Enroll students error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to enroll students",
    });
  }
});

// Remove students from course
router.delete("/:id/students/:studentId", authenticate, async (req, res) => {
  try {
    const { id: courseId, studentId } = req.params;

    // Check if course belongs to teacher
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        teacherId: (req as any).user.id,
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Remove enrollment
    const deletedEnrollment = await prisma.studentCourse.deleteMany({
      where: {
        courseId,
        studentId,
      },
    });

    if (deletedEnrollment.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not enrolled in this course",
      });
    }

    logger.info(
      `Student ${studentId} removed from course ${course.courseCode}`
    );

    res.json({
      success: true,
      message: "Student removed from course successfully",
    });
  } catch (error) {
    logger.error("Remove student from course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove student from course",
    });
  }
});

// Get all courses for dropdown selection (used in registration)
router.get("/all", async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        courseCode: true,
        courseTitle: true,
        creditUnits: true,
        semester: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        courseCode: "asc",
      },
    });

    const formattedCourses = courses.map((course) => ({
      id: course.id,
      value: course.id,
      label: `${course.courseCode} - ${course.courseTitle}`,
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      creditUnits: course.creditUnits,
      semester: course.semester,
      teacher: `${course.teacher.firstName} ${course.teacher.lastName}`,
    }));

    res.json({
      success: true,
      data: formattedCourses,
    });
  } catch (error) {
    logger.error("Get all courses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
    });
  }
});

// Create new course (public endpoint for registration)
router.post("/create", async (req, res) => {
  try {
    const { error, value } = createCourseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Check if course code already exists
    const existingCourse = await prisma.course.findUnique({
      where: {
        courseCode: value.courseCode,
      },
    });

    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: "Course with this code already exists",
      });
    }

    // Create course without teacher assignment (will be assigned during registration)
    const course = await prisma.course.create({
      data: {
        courseCode: value.courseCode,
        courseTitle: value.courseTitle,
        description: value.description,
        creditUnits: value.creditUnits,
        semester: value.semester,
        academicYear: value.academicYear,
        teacherId: "temp-id", // Will be updated when teacher registers
      },
      select: {
        id: true,
        courseCode: true,
        courseTitle: true,
        creditUnits: true,
        semester: true,
      },
    });

    logger.info(`Course created: ${course.courseCode}`);

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: {
        id: course.id,
        value: course.id,
        label: `${course.courseCode} - ${course.courseTitle}`,
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        creditUnits: course.creditUnits,
        semester: course.semester,
      },
    });
  } catch (error) {
    logger.error("Create course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create course",
    });
  }
});

export default router;
