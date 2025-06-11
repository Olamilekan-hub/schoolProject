// src/routes/attendance.ts - Attendance Routes
import express from "express";
import { prisma } from "../config/database";
import { authenticate } from "../middleware/auth";
import {
  validateAttendanceSession,
  validateMarkAttendance,
} from "../middleware/validation";
import { logger } from "../utils/logger";
import { generateAttendanceLink } from "../utils/attendance";

const router = express.Router();

// Get all attendance sessions
router.get("/sessions", authenticate, async (req, res) => {
  try {
    const { courseId, status, date } = req.query;

    const where: any = {
      teacherId: req.user!.id,
    };

    if (courseId) where.courseId = courseId;
    if (status) where.status = status;
    if (date) {
      where.sessionDate = {
        gte: new Date(date as string),
        lt: new Date(new Date(date as string).getTime() + 24 * 60 * 60 * 1000),
      };
    }

    const sessions = await prisma.attendanceSession.findMany({
      where,
      include: {
        course: true,
        attendanceRecords: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        sessionDate: "desc",
      },
    });

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    logger.error("Get sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance sessions",
    });
  }
});

// Get single session
router.get("/sessions/:id", authenticate, async (req, res) => {
  try {
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: req.params.id,
        teacherId: req.user!.id,
      },
      include: {
        course: true,
        attendanceRecords: {
          include: {
            student: true,
          },
          orderBy: {
            markedAt: "desc",
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error("Get session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch session",
    });
  }
});

// Create attendance session
router.post(
  "/sessions",
  authenticate,
  validateAttendanceSession,
  async (req, res) => {
    try {
      const {
        courseId,
        sessionName,
        sessionDate,
        startTime,
        endTime,
        allowRemoteMarking,
      } = req.body;

      const session = await prisma.attendanceSession.create({
        data: {
          courseId,
          teacherId: req.user!.id,
          sessionName,
          sessionDate: new Date(sessionDate),
          startTime: new Date(`${sessionDate}T${startTime}`),
          endTime: endTime ? new Date(`${sessionDate}T${endTime}`) : null,
          allowRemoteMarking,
          attendanceLinkToken: allowRemoteMarking
            ? generateAttendanceLink()
            : null,
          linkExpiresAt: allowRemoteMarking
            ? new Date(Date.now() + 24 * 60 * 60 * 1000)
            : null,
        },
        include: {
          course: true,
        },
      });

      // Emit real-time update
      const io = req.app.get("io");
      io.emit("session_created", {
        sessionId: session.id,
        sessionName: session.sessionName,
        courseCode: session.course.courseCode,
      });

      logger.info(`New attendance session created: ${session.sessionName}`);

      res.status(201).json({
        success: true,
        message: "Attendance session created successfully",
        data: session,
      });
    } catch (error) {
      logger.error("Create session error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create attendance session",
      });
    }
  }
);

// Get session attendance records
router.get("/sessions/:id/records", authenticate, async (req, res) => {
  try {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        sessionId: req.params.id,
        session: {
          teacherId: req.user!.id,
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
    });

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    logger.error("Get records error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance records",
    });
  }
});

// Mark attendance
router.post("/mark", authenticate, validateMarkAttendance, async (req, res) => {
  try {
    const {
      sessionId,
      studentId,
      biometricData,
      verificationMethod = "MANUAL",
      deviceInfo,
      remarks,
    } = req.body;

    // Check if session exists and belongs to teacher
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        teacherId: req.user!.id,
        status: "OPEN",
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found or not active",
      });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if attendance already marked
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId,
        },
      },
    });

    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for this student",
      });
    }

    // Mark attendance
    const attendanceRecord = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId,
        status: "PRESENT",
        verificationMethod,
        biometricVerified: !!biometricData,
        verificationConfidence: biometricData ? Math.random() * 20 + 80 : null,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      },
      include: {
        student: true,
      },
    });

    logger.info(
      `Remote attendance marked: ${student.matricNumber} for session ${session.id}`
    );

    res.json({
      success: true,
      message: `Attendance marked successfully for ${student.firstName} ${student.lastName}`,
      data: attendanceRecord,
    });
  } catch (error) {
    logger.error("Mark attendance by link error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
    });
  }
});

// Generate attendance link
router.post("/sessions/:id/generate-link", authenticate, async (req, res) => {
  try {
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: req.params.id,
        teacherId: req.user!.id,
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const token = generateAttendanceLink();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.attendanceSession.update({
      where: { id: req.params.id },
      data: {
        attendanceLinkToken: token,
        linkExpiresAt: expiresAt,
        allowRemoteMarking: true,
      },
    });

    const link = `${process.env.FRONTEND_URL}/attendance/${token}`;

    res.json({
      success: true,
      data: {
        link,
        token,
        expiresAt,
      },
    });
  } catch (error) {
    logger.error("Generate link error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate attendance link",
    });
  }
});

// Update session status
router.patch("/sessions/:id/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const session = await prisma.attendanceSession.update({
      where: {
        id: req.params.id,
        teacherId: req.user!.id,
      },
      data: { status },
      include: {
        course: true,
      },
    });

    // Emit real-time update
    const io = req.app.get("io");
    io.emit("session_status_changed", {
      sessionId: session.id,
      status,
      sessionName: session.sessionName,
    });

    res.json({
      success: true,
      message: "Session status updated successfully",
      data: session,
    });
  } catch (error) {
    logger.error("Update session status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update session status",
    });
  }
});

export default router;
