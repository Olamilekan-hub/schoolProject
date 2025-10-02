// src/routes/dashboard.ts - Dashboard Routes
import express from "express";
import { prisma } from "../config/database";
import { authenticate } from "../middleware/auth";
import { logger } from "../utils/logger";
import { subDays, startOfDay, endOfDay } from "date-fns";

// Extend Express Request interface to include user property
import { Request } from "express";
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
      firstName: string;
      lastName: string;
    };
  }
}

const router = express.Router();

// Get dashboard data
router.get("/", authenticate, async (req, res) => {
  try {
    const teacherId = req.user!.id;

    // Get basic statistics
    const [
      totalStudents,
      totalCourses,
      totalSessions,
      todayAttendance,
      enrolledBiometric,
    ] = await Promise.all([
      // Total students registered by this teacher
      prisma.student.count({
        where: {
          registeredById: teacherId,
          status: "ACTIVE",
        },
      }),

      // Total courses taught by this teacher
      prisma.course.count({
        where: {
          teacherId,
          isActive: true,
        },
      }),

      // Total sessions created
      prisma.attendanceSession.count({
        where: { teacherId },
      }),

      // Today's attendance count
      prisma.attendanceRecord.count({
        where: {
          session: {
            teacherId,
          },
          markedAt: {
            gte: startOfDay(new Date()),
            lte: endOfDay(new Date()),
          },
        },
      }),

      // Students with biometric enrolled
      prisma.student.count({
        where: {
          registeredById: teacherId,
          status: "ACTIVE",
        },
      }),
    ]);

    // Get recent attendance records
    const recentAttendance = await prisma.attendanceRecord.findMany({
      where: {
        session: {
          teacherId,
        },
      },
      include: {
        student: true,
        session: {
          include: {
            course: true,
          },
        },
      },
      orderBy: {
        markedAt: "desc",
      },
      take: 10,
    });

    // Get upcoming sessions
    const upcomingSessions = await prisma.attendanceSession.findMany({
      where: {
        teacherId,
        sessionDate: {
          gte: new Date(),
        },
        status: "OPEN",
      },
      include: {
        course: true,
      },
      orderBy: {
        sessionDate: "asc",
      },
      take: 5,
    });

    // Get attendance trend (last 7 days)
    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const count = await prisma.attendanceRecord.count({
        where: {
          session: {
            teacherId,
          },
          markedAt: {
            gte: startOfDay(date),
            lte: endOfDay(date),
          },
        },
      });

      attendanceTrend.push({
        date: date.toISOString().split("T")[0],
        attendance: count,
      });
    }

    // Get course attendance comparison
    const courses = await prisma.course.findMany({
      where: { teacherId, isActive: true },
    });

    const courseAttendance = await Promise.all(
      courses.map(async (course) => {
        const totalSessions = await prisma.attendanceSession.count({
          where: { courseId: course.id },
        });

        const totalAttendance = await prisma.attendanceRecord.count({
          where: {
            session: {
              courseId: course.id,
            },
          },
        });

        const enrolledStudents = await prisma.studentCourse.count({
          where: { courseId: course.id },
        });

        const maxPossible = totalSessions * enrolledStudents;
        const percentage =
          maxPossible > 0
            ? Math.round((totalAttendance / maxPossible) * 100)
            : 0;

        return {
          courseCode: course.courseCode,
          percentage,
        };
      })
    );

    const stats = {
      totalStudents,
      totalCourses,
      totalSessions,
      todayAttendance,
      activeStudents: totalStudents, // For now, same as total
      enrolledBiometric,
      attendanceRate:
        totalStudents > 0
          ? Math.round((enrolledBiometric / totalStudents) * 100)
          : 0,
    };

    res.json({
      success: true,
      data: {
        stats,
        recentAttendance,
        upcomingSessions,
        attendanceTrend,
        courseAttendance,
      },
    });
  } catch (error) {
    logger.error("Get dashboard data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
});

export default router;
