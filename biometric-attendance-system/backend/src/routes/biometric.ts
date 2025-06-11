// src/routes/biometric.ts - Biometric Routes
import express from "express";
import { prisma } from "../config/database";
import { authenticate } from "../middleware/auth";
import { encryptBiometric, verifyBiometric } from "../utils/biometric";
import { logger } from "../utils/logger";

const router = express.Router();

// Enroll biometric
router.post("/enroll", authenticate, async (req, res) => {
  try {
    const { studentId, biometricData, deviceInfo, qualityScore } = req.body;

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

    // Encrypt biometric data
    const encryptedTemplate = encryptBiometric(biometricData);

    // Update student with biometric data
    const updatedStudent = await prisma.$transaction(async (tx) => {
      // Update student record
      const student = await tx.student.update({
        where: { id: studentId },
        data: {
          biometricEnrolled: true,
          biometricEnrolledAt: new Date(),
        },
      });

      // Create or update biometric template
      await tx.biometricTemplate.upsert({
        where: {
          studentId_templateType: {
            studentId,
            templateType: "FINGERPRINT",
          },
        },
        update: {
          templateData: encryptedTemplate,
          qualityScore,
          enrollmentDevice: deviceInfo ? deviceInfo : undefined,
        },
        create: {
          studentId,
          templateData: encryptedTemplate,
          templateType: "FINGERPRINT",
          qualityScore,
          enrollmentDevice: deviceInfo ? JSON.stringify(deviceInfo) : undefined,
        },
      });

      return student;
    });

    logger.info(`Biometric enrolled for student: ${student.matricNumber}`);

    res.json({
      success: true,
      message: "Biometric enrollment successful",
      data: updatedStudent,
    });
  } catch (error) {
    logger.error("Biometric enrollment error:", error);
    res.status(500).json({
      success: false,
      message: "Biometric enrollment failed",
    });
  }
});

// Verify biometric
router.post("/verify", authenticate, async (req, res) => {
  try {
    const { studentId, biometricData } = req.body;

    // Get stored biometric template
    const template = await prisma.biometricTemplate.findFirst({
      where: {
        studentId,
        templateType: "FINGERPRINT",
      },
      include: {
        student: true,
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "No biometric template found for this student",
      });
    }

    // Verify biometric
    const { matched, confidence } = verifyBiometric(
      biometricData,
      template.templateData
    );

    res.json({
      success: true,
      data: {
        matched,
        confidence,
        studentId,
        templateId: template.id,
      },
    });
  } catch (error) {
    logger.error("Biometric verification error:", error);
    res.status(500).json({
      success: false,
      message: "Biometric verification failed",
    });
  }
});

// Get biometric status
router.get("/status/:studentId", authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        biometricEnrolled: true,
        biometricEnrolledAt: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      data: {
        enrolled: student.biometricEnrolled,
        enrolledAt: student.biometricEnrolledAt,
      },
    });
  } catch (error) {
    logger.error("Get biometric status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get biometric status",
    });
  }
});

// Delete biometric
router.delete("/:studentId", authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    await prisma.$transaction(async (tx) => {
      // Delete biometric templates
      await tx.biometricTemplate.deleteMany({
        where: { studentId },
      });

      // Update student record
      await tx.student.update({
        where: { id: studentId },
        data: {
          biometricEnrolled: false,
          biometricEnrolledAt: null,
        },
      });
    });

    logger.info(`Biometric data deleted for student: ${studentId}`);

    res.json({
      success: true,
      message: "Biometric data deleted successfully",
    });
  } catch (error) {
    logger.error("Delete biometric error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete biometric data",
    });
  }
});

export default router;
