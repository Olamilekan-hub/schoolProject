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

    // Create or update biometric template
    const biometricTemplate = await prisma.biometricTemplate.upsert({
      where: {
        studentId_templateType: {
          studentId,
          templateType: "FINGERPRINT",
        },
      },
      update: {
        templateData: encryptedTemplate,
        qualityScore,
        enrollmentDevice: deviceInfo ? JSON.stringify(deviceInfo) : undefined,
      },
      create: {
        studentId,
        templateData: encryptedTemplate,
        templateType: "FINGERPRINT",
        qualityScore,
        enrollmentDevice: deviceInfo ? JSON.stringify(deviceInfo) : undefined,
      },
      include: {
        student: true,
      },
    });

    logger.info(`Biometric enrolled for student: ${biometricTemplate.student.matricNumber}`);

    res.json({
      success: true,
      message: "Biometric enrollment successful",
      data: biometricTemplate.student,
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
      include: {
        biometricTemplates: {
          select: {
            templateType: true,
            createdAt: true,
            qualityScore: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const hasFingerprint = student.biometricTemplates.some(
      (template) => template.templateType === "FINGERPRINT"
    );
    const latestEnrollment = student.biometricTemplates.length > 0
      ? student.biometricTemplates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      : null;

    res.json({
      success: true,
      data: {
        enrolled: hasFingerprint,
        enrolledAt: latestEnrollment?.createdAt,
        templates: student.biometricTemplates.length,
        qualityScore: latestEnrollment?.qualityScore,
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

    // Delete biometric templates
    const deletedCount = await prisma.biometricTemplate.deleteMany({
      where: { studentId },
    });

    logger.info(`Deleted ${deletedCount.count} biometric templates for student: ${studentId}`);

    res.json({
      success: true,
      message: "Biometric data deleted successfully",
      data: {
        deletedTemplates: deletedCount.count,
      },
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
