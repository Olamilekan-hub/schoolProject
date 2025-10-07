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
      verificationConfidence,
      deviceInfo,
      remarks,
    } = req.body;

    // Validate session exists and is open
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        teacherId: req.user!.id,
        status: "OPEN",
      },
      include: {
        course: true
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found or not active",
      });
    }

    // Validate student exists
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
        message: "Attendance already marked for this student in this session",
      });
    }

    // ✅ Biometric verification if provided
    let biometricVerified = false;
    let finalConfidence = verificationConfidence || null;

    if (biometricData && verificationMethod === 'BIOMETRIC') {
      logger.info(`🔍 Performing biometric verification for attendance marking...`);
      
      try {
        // Get stored template
        const storedTemplate = await prisma.biometricTemplate.findFirst({
          where: { studentId, templateType: 'FINGERPRINT' }
        });

        if (!storedTemplate) {
          return res.status(400).json({
            success: false,
            message: `Student ${student.matricNumber} is not enrolled for biometric attendance`,
          });
        }

        // Verify the fingerprint
        const verification = verifyBiometric(
          biometricData,
          storedTemplate.templateData
        );

        biometricVerified = verification.matched;
        finalConfidence = verification.confidence;

        logger.info(
          `🔐 Attendance verification result:\n` +
          `  Student: ${student.firstName} ${student.lastName} (${student.matricNumber})\n` +
          `  Session: ${session.sessionName}\n` +
          `  Course: ${session.course.courseCode}\n` +
          `  Verified: ${biometricVerified ? '✅ YES' : '❌ NO'}\n` +
          `  Confidence: ${finalConfidence.toFixed(2)}%`
        );

        // Reject if verification failed
        if (!biometricVerified) {
          return res.status(403).json({
            success: false,
            message: `Biometric verification failed. Confidence: ${finalConfidence.toFixed(1)}%. Please try again or contact your instructor.`,
            data: {
              verified: false,
              confidence: finalConfidence,
              threshold: process.env.BIOMETRIC_CONFIDENCE_THRESHOLD || 75
            }
          });
        }

      } catch (verifyError: any) {
        logger.error('❌ Verification error during attendance marking:', verifyError);
        return res.status(500).json({
          success: false,
          message: 'Biometric verification failed: ' + verifyError.message,
        });
      }
    }

    // ✅ Create attendance record
    const attendanceRecord = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId,
        status: "PRESENT",
        verificationMethod,
        biometricVerified,
        verificationConfidence: finalConfidence,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        remarks,
      },
      include: {
        student: true,
        session: {
          include: {
            course: true
          }
        }
      },
    });

    // Emit real-time update
    const io = req.app.get("io");
    if (io) {
      io.emit("attendance_marked", {
        sessionId: session.id,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        matricNumber: student.matricNumber,
        method: verificationMethod,
        verified: biometricVerified,
        confidence: finalConfidence,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(
      `✅ Attendance marked successfully:\n` +
      `  Student: ${student.firstName} ${student.lastName} (${student.matricNumber})\n` +
      `  Session: ${session.sessionName}\n` +
      `  Course: ${session.course.courseCode}\n` +
      `  Method: ${verificationMethod}\n` +
      `  Biometric Verified: ${biometricVerified}\n` +
      `  Confidence: ${finalConfidence ? finalConfidence.toFixed(2) + '%' : 'N/A'}\n` +
      `  Time: ${new Date().toISOString()}`
    );

    res.json({
      success: true,
      message: `Attendance marked successfully for ${student.firstName} ${student.lastName}`,
      data: {
        record: attendanceRecord,
        verification: {
          method: verificationMethod,
          biometricVerified,
          confidence: finalConfidence
        }
      },
    });
  } catch (error: any) {
    logger.error("❌ Mark attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
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
