import express from "express";
import { prisma } from "../config/database";
import { authenticate } from "../middleware/auth";
import { encryptBiometric, verifyBiometric } from "../utils/biometric";
import { logger } from "../utils/logger";

const router = express.Router();

// Enroll biometric with Digital Persona
router.post("/enroll", authenticate, async (req, res) => {
  try {
    const { 
      studentId, 
      biometricData, 
      deviceInfo, 
      qualityScore,
      scannerModel,
      templateFormat 
    } = req.body;

    // Validate input
    if (!studentId || !biometricData) {
      return res.status(400).json({
        success: false,
        message: "Student ID and biometric data are required",
      });
    }

    // Validate template format for Digital Persona
    try {
      const template = JSON.parse(biometricData);
      if (!template.template) {
        return res.status(400).json({
          success: false,
          message: "Invalid biometric template format",
        });
      }
      
      // Check if it's Digital Persona format
      if (template.format !== 'ANSI-378') {
        logger.warn(`Non-standard template format: ${template.format}`);
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid biometric template data",
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

    // Check minimum quality score
    const minQuality = 60;
    if (qualityScore && qualityScore < minQuality) {
      return res.status(400).json({
        success: false,
        message: `Quality score too low. Minimum required: ${minQuality}`,
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
        qualityScore: qualityScore || null,
        enrollmentDevice: deviceInfo ? JSON.stringify(deviceInfo) : null,
        scannerModel: scannerModel || 'Digital Persona U.4500',
        templateFormat: templateFormat || 'ANSI-378',
      },
      create: {
        studentId,
        templateData: encryptedTemplate,
        templateType: "FINGERPRINT",
        qualityScore: qualityScore || null,
        enrollmentDevice: deviceInfo ? JSON.stringify(deviceInfo) : null,
        scannerModel: scannerModel || 'Digital Persona U.4500',
        templateFormat: templateFormat || 'ANSI-378',
      },
      include: {
        student: true,
      },
    });

    // Update student's biometric enrollment status
    await prisma.student.update({
      where: { id: studentId },
      data: { biometricEnrolled: true },
    });

    logger.info(`Biometric enrolled for student: ${biometricTemplate.student.matricNumber} using ${scannerModel || 'Digital Persona U.4500'}`);

    res.json({
      success: true,
      message: "Biometric enrollment successful",
      data: {
        ...biometricTemplate.student,
        biometricEnrolled: true,
      },
    });
  } catch (error) {
    logger.error("Biometric enrollment error:", error);
    res.status(500).json({
      success: false,
      message: "Biometric enrollment failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Verify biometric
router.post("/verify", authenticate, async (req, res) => {
  try {
    const { 
      studentId, 
      biometricData,
      scannerModel,
      templateFormat 
    } = req.body;

    if (!studentId || !biometricData) {
      return res.status(400).json({
        success: false,
        message: "Student ID and biometric data are required",
      });
    }

    // Validate template format
    try {
      const template = JSON.parse(biometricData);
      if (!template.template) {
        return res.status(400).json({
          success: false,
          message: "Invalid biometric template format",
        });
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid biometric template data",
      });
    }

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

    logger.info(`Biometric verification: studentId=${studentId}, matched=${matched}, confidence=${confidence}`);

    res.json({
      success: true,
      data: {
        matched,
        confidence,
        studentId,
        templateId: template.id,
        student: {
          id: template.student.id,
          matricNumber: template.student.matricNumber,
          firstName: template.student.firstName,
          lastName: template.student.lastName,
        },
      },
    });
  } catch (error) {
    logger.error("Biometric verification error:", error);
    res.status(500).json({
      success: false,
      message: "Biometric verification failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
            scannerModel: true,
            templateFormat: true,
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
      ? student.biometricTemplates.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
      : null;

    res.json({
      success: true,
      data: {
        enrolled: hasFingerprint,
        enrolledAt: latestEnrollment?.createdAt,
        templates: student.biometricTemplates.length,
        qualityScore: latestEnrollment?.qualityScore,
        scannerModel: latestEnrollment?.scannerModel,
        templateFormat: latestEnrollment?.templateFormat,
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

    // Update student's biometric enrollment status
    await prisma.student.update({
      where: { id: studentId },
      data: { biometricEnrolled: false },
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

// Test endpoint - check Digital Persona device connectivity
router.get("/test/device", authenticate, async (req, res) => {
  try {
    // This is a server-side check
    // Actual device check happens on client side
    res.json({
      success: true,
      message: "Device check endpoint available",
      data: {
        supportedScanners: ['Digital Persona U.4500'],
        supportedFormats: ['ANSI-378'],
        minQualityScore: 60,
        matchThreshold: 75,
      },
    });
  } catch (error) {
    logger.error("Device test error:", error);
    res.status(500).json({
      success: false,
      message: "Device test failed",
    });
  }
});

export default router;
