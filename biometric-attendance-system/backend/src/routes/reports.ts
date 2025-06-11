// src/routes/reports.ts - Backend Reports Routes
import express from "express";
import { prisma } from "../config/database";
import { authenticate } from "../middleware/auth";
import { logger } from "../utils/logger";
import {
  generatePDFReport,
  generateExcelReport,
} from "../utils/reportGenerator";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

const router = express.Router();

// Get attendance report
router.get("/attendance", authenticate, async (req, res) => {
  try {
    const {
      courseId,
      startDate,
      endDate,
      studentId,
      format: reportFormat = "json",
    } = req.query;

    const teacherId = req.user!.id;

    // Build filters
    const sessionFilter: any = { teacherId };
    const dateFilter: any = {};

    if (courseId) sessionFilter.courseId = courseId as string;

    if (startDate || endDate) {
      dateFilter.sessionDate = {};
      if (startDate) dateFilter.sessionDate.gte = new Date(startDate as string);
      if (endDate) dateFilter.sessionDate.lte = new Date(endDate as string);
    }

    // Combine filters
    Object.assign(sessionFilter, dateFilter);

    // Get attendance sessions with records
    const sessions = await prisma.attendanceSession.findMany({
      where: sessionFilter,
      include: {
        course: true,
        attendanceRecords: {
          include: {
            student: true,
          },
          where: studentId ? { studentId: studentId as string } : undefined,
        },
      },
      orderBy: {
        sessionDate: "desc",
      },
    });

    // Get overall statistics
    const totalSessions = sessions.length;
    const totalRecords = sessions.reduce(
      (sum, session) => sum + session.attendanceRecords.length,
      0
    );

    // Get unique courses
    const courses = [
      ...new Map(sessions.map((s) => [s.courseId, s.course])).values(),
    ];

    // Get enrolled students count
    const enrolledStudentsCount = courseId
      ? await prisma.studentCourse.count({
          where: { courseId: courseId as string },
        })
      : await prisma.studentCourse.count({
          where: {
            course: { teacherId },
          },
        });

    const maxPossibleAttendance = totalSessions * enrolledStudentsCount;
    const averageAttendance =
      maxPossibleAttendance > 0
        ? Math.round((totalRecords / maxPossibleAttendance) * 100)
        : 0;

    // Generate student summary
    const studentAttendance = new Map();

    sessions.forEach((session) => {
      session.attendanceRecords.forEach((record) => {
        const key = record.studentId;
        if (!studentAttendance.has(key)) {
          studentAttendance.set(key, {
            student: record.student,
            totalSessions: 0,
            attendedSessions: 0,
            records: [],
          });
        }

        const data = studentAttendance.get(key);
        data.totalSessions = Math.max(data.totalSessions, sessions.length);
        if (record.status === "PRESENT") {
          data.attendedSessions++;
        }
        data.records.push({
          sessionId: session.id,
          sessionName: session.sessionName,
          sessionDate: session.sessionDate,
          status: record.status,
          markedAt: record.markedAt,
        });
      });
    });

    // Convert to array and calculate percentages
    const studentSummary = Array.from(studentAttendance.values()).map(
      (data) => ({
        ...data,
        attendancePercentage:
          data.totalSessions > 0
            ? Math.round((data.attendedSessions / data.totalSessions) * 100)
            : 0,
      })
    );

    // Generate session summary
    const sessionSummary = sessions.map((session) => {
      const presentCount = session.attendanceRecords.filter(
        (r) => r.status === "PRESENT"
      ).length;
      const totalMarked = session.attendanceRecords.length;

      return {
        sessionId: session.id,
        sessionName: session.sessionName,
        sessionDate: session.sessionDate,
        courseCode: session.course.courseCode,
        courseTitle: session.course.courseTitle,
        presentCount,
        totalMarked,
        attendancePercentage:
          totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0,
      };
    });

    const reportData = {
      reportInfo: {
        generatedAt: new Date().toISOString(),
        generatedBy: `${req.user!.firstName} ${req.user!.lastName}`,
        period: {
          startDate: startDate as string,
          endDate: endDate as string,
        },
        filters: {
          courseId,
          studentId,
        },
      },
      statistics: {
        totalSessions,
        totalRecords,
        enrolledStudents: enrolledStudentsCount,
        averageAttendance,
        totalCourses: courses.length,
      },
      courses: courses.map((course) => ({
        id: course.id,
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
      })),
      sessions: sessionSummary,
      students: studentSummary,
    };

    // Return based on format
    if (reportFormat === "pdf") {
      const pdfBuffer = await generatePDFReport(reportData);
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=attendance-report-${format(new Date(), "yyyy-MM-dd")}.pdf`,
      });
      res.send(pdfBuffer);
    } else if (reportFormat === "excel") {
      const excelBuffer = await generateExcelReport(reportData);
      res.set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=attendance-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      });
      res.send(excelBuffer);
    } else {
      res.json({
        success: true,
        data: reportData,
      });
    }
  } catch (error) {
    logger.error("Get attendance report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate attendance report",
    });
  }
});

// Get dashboard analytics
router.get("/analytics", authenticate, async (req, res) => {
  try {
    const { days = 30, courseId } = req.query;
    const teacherId = req.user!.id;
    const daysCount = parseInt(days as string);

    // Date range
    const endDate = new Date();
    const startDate = subDays(endDate, daysCount);

    // Build course filter
    const courseFilter = courseId
      ? { courseId: courseId as string }
      : { teacherId };

    // Get attendance trend
    const attendanceTrend = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const [sessionsCount, attendanceCount] = await Promise.all([
        prisma.attendanceSession.count({
          where: {
            ...courseFilter,
            sessionDate: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        }),
        prisma.attendanceRecord.count({
          where: {
            session: courseFilter,
            markedAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        }),
      ]);

      attendanceTrend.push({
        date: format(date, "yyyy-MM-dd"),
        sessions: sessionsCount,
        attendance: attendanceCount,
        rate:
          sessionsCount > 0
            ? Math.round((attendanceCount / sessionsCount) * 100)
            : 0,
      });
    }

    // Get course performance comparison
    const courses = await prisma.course.findMany({
      where: { teacherId },
      include: {
        attendanceSessions: {
          where: {
            sessionDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            attendanceRecords: true,
          },
        },
        studentCourses: true,
      },
    });

    const coursePerformance = courses.map((course) => {
      const totalSessions = course.attendanceSessions.length;
      const totalAttendance = course.attendanceSessions.reduce(
        (sum, session) => sum + session.attendanceRecords.length,
        0
      );
      const enrolledStudents = course.studentCourses.length;
      const maxPossible = totalSessions * enrolledStudents;

      return {
        courseId: course.id,
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        totalSessions,
        totalAttendance,
        enrolledStudents,
        attendanceRate:
          maxPossible > 0
            ? Math.round((totalAttendance / maxPossible) * 100)
            : 0,
      };
    });

    // Get top and low performers
    const studentsPerformance = await prisma.student.findMany({
      where: {
        registeredById: teacherId,
        status: "ACTIVE",
        ...(courseId
          ? {
              studentCourses: {
                some: { courseId: courseId as string },
              },
            }
          : {}),
      },
      include: {
        attendanceRecords: {
          where: {
            session: {
              ...courseFilter,
              sessionDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
        studentCourses: courseId
          ? {
              where: { courseId: courseId as string },
            }
          : true,
      },
    });

    const performanceData = await Promise.all(
      studentsPerformance.map(async (student) => {
        const attendedSessions = student.attendanceRecords.filter(
          (r) => r.status === "PRESENT"
        ).length;
        const totalPossibleSessions = courseId
          ? await prisma.attendanceSession.count({
              where: {
                courseId: courseId as string,
                sessionDate: { gte: startDate, lte: endDate },
              },
            })
          : await prisma.attendanceSession.count({
              where: {
                teacherId,
                sessionDate: { gte: startDate, lte: endDate },
              },
            });

        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          matricNumber: student.matricNumber,
          attendedSessions,
          totalPossibleSessions,
          attendanceRate:
            totalPossibleSessions > 0
              ? Math.round((attendedSessions / totalPossibleSessions) * 100)
              : 0,
        };
      })
    );

    // Sort for top and low performers
    const sortedPerformance = performanceData.sort(
      (a, b) => b.attendanceRate - a.attendanceRate
    );
    const topPerformers = sortedPerformance.slice(0, 10);
    const lowPerformers = sortedPerformance.slice(-10).reverse();

    res.json({
      success: true,
      data: {
        attendanceTrend,
        coursePerformance,
        topPerformers,
        lowPerformers,
        summary: {
          totalCourses: courses.length,
          totalStudents: studentsPerformance.length,
          averageAttendanceRate:
            performanceData.length > 0
              ? Math.round(
                  performanceData.reduce(
                    (sum, p) => sum + p.attendanceRate,
                    0
                  ) / performanceData.length
                )
              : 0,
        },
      },
    });
  } catch (error) {
    logger.error("Get analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics data",
    });
  }
});

// Export reports
router.post("/export", authenticate, async (req, res) => {
  try {
    const {
      format = "excel",
      reportType = "attendance",
      filters = {},
    } = req.body;

    // Generate report data based on type
    let reportData;
    switch (reportType) {
      case "attendance":
        // Reuse attendance report logic
        const attendanceReq = { query: filters, user: req.user };
        reportData = await generateAttendanceReportData(attendanceReq);
        break;
      case "students":
        reportData = await generateStudentsReportData(req.user!.id, filters);
        break;
      case "analytics":
        reportData = await generateAnalyticsReportData(req.user!.id, filters);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid report type",
        });
    }

    // Generate file based on format
    let fileBuffer;
    let contentType;
    let filename;

    switch (format.toLowerCase()) {
      case "pdf":
        fileBuffer = await generatePDFReport(reportData);
        contentType = "application/pdf";
        filename = `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
        break;
      case "excel":
        fileBuffer = await generateExcelReport(reportData);
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        filename = `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
        break;
      case "csv":
        fileBuffer = await generateCSVReport(reportData);
        contentType = "text/csv";
        filename = `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid export format",
        });
    }

    res.set({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename=${filename}`,
    });
    res.send(fileBuffer);
  } catch (error) {
    logger.error("Export report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export report",
    });
  }
});

// Helper functions for generating different report types
async function generateAttendanceReportData(req: any) {
  // Implementation similar to GET /attendance but returns structured data
  // This is a simplified version - you'd implement the full logic here
  return {
    reportType: "attendance",
    generatedAt: new Date(),
    data: {}, // Your attendance report data
  };
}

async function generateStudentsReportData(teacherId: string, filters: any) {
  const students = await prisma.student.findMany({
    where: {
      registeredById: teacherId,
      ...(filters.status && { status: filters.status }),
      ...(filters.courseId && {
        studentCourses: {
          some: { courseId: filters.courseId },
        },
      }),
    },
    include: {
      studentCourses: {
        include: {
          course: true,
        },
      },
      attendanceRecords: {
        include: {
          session: {
            include: {
              course: true,
            },
          },
        },
      },
    },
  });

  return {
    reportType: "students",
    generatedAt: new Date(),
    data: {
      students: students.map((student) => ({
        ...student,
        totalAttendance: student.attendanceRecords.length,
        coursesEnrolled: student.studentCourses.length,
      })),
    },
  };
}

async function generateAnalyticsReportData(teacherId: string, filters: any) {
  // Generate comprehensive analytics data
  return {
    reportType: "analytics",
    generatedAt: new Date(),
    data: {
      // Your analytics data here
    },
  };
}

export default router;
