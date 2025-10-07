import express from "express";
import { prisma } from "../config/database";
import { authenticate } from "../middleware/auth";
import { encryptBiometric, verifyBiometric } from "../utils/biometric";
import { digitalPersonaService } from "../services/digitalPersonaService"; // Added
import { logger } from "../utils/logger";

const router = express.Router();

/* ============================================================
   NEW ENDPOINT: DEVICE STATUS CHECK
============================================================ */
router.get("/device/status", authenticate, async (req, res) => {
  try {
    const status = await digitalPersonaService.getDeviceStatus();
    res.json({
      success: true,
      data: {
        isConnected: status.connected,
        installed: status.installed,
        deviceInfo: status.connected
          ? {
            name: status.model || "Digital Persona U.are.U 4500",
            manufacturer: "HID Global",
            model: status.model || "U.are.U 4500",
            type: "FINGERPRINT",
          }
          : null,
      },
    });
  } catch (error) {
    logger.error("Device status check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check device status",
    });
  }
});

/* ============================================================
   NEW ENDPOINT: LIVE CAPTURE
============================================================ */
router.post("/capture", authenticate, async (req, res) => {
  try {
    logger.info("Starting fingerprint capture...");

    const result = await digitalPersonaService.captureFingerprint();

    if (result.success) {
      res.json({
        success: true,
        data: {
          templateData: result.templateData,
          qualityScore: result.qualityScore,
          confidence: result.confidence,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || "Capture failed",
      });
    }
  } catch (error: any) {
    logger.error("Capture error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to capture fingerprint",
    });
  }
});

/* ============================================================
   ENROLL BIOMETRIC (UPDATED WITH LIVE CAPTURE SUPPORT)
============================================================ */
router.post("/enroll", authenticate, async (req, res) => {
  try {
    const {
      studentId,
      biometricData,
      deviceInfo,
      qualityScore,
      scannerModel,
      templateFormat,
      useLiveCapture, // Added support
    } = req.body;

    // Optional live capture
    let finalBiometricData = biometricData;
    let finalQualityScore = qualityScore;

    if (useLiveCapture) {
      logger.info("Using live capture for enrollment");
      const captureResult = await digitalPersonaService.captureFingerprint();

      if (!captureResult.success) {
        return res.status(400).json({
          success: false,
          message: captureResult.error || "Live capture failed",
        });
      }

      finalBiometricData = captureResult.templateData;
      finalQualityScore = captureResult.qualityScore;
    }

    if (!studentId || !finalBiometricData) {
      return res.status(400).json({
        success: false,
        message: "Student ID and biometric data are required",
      });
    }

    // Validate template format (Digital Persona)
    try {
      const template = JSON.parse(finalBiometricData);
      if (!template.template) {
        return res.status(400).json({
          success: false,
          message: "Invalid biometric template format",
        });
      }

      if (template.format !== "ANSI-378") {
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

    // Minimum quality
    const minQuality = 60;
    if (finalQualityScore && finalQualityScore < minQuality) {
      return res.status(400).json({
        success: false,
        message: `Quality score too low. Minimum required: ${minQuality}`,
      });
    }

    // Encrypt biometric data
    const encryptedTemplate = encryptBiometric(finalBiometricData);

    // Save or update
    const biometricTemplate = await prisma.biometricTemplate.upsert({
      where: {
        studentId_templateType: {
          studentId,
          templateType: "FINGERPRINT",
        },
      },
      update: {
        templateData: encryptedTemplate,
        qualityScore: finalQualityScore || null,
        enrollmentDevice: deviceInfo ? JSON.stringify(deviceInfo) : null,
        scannerModel: scannerModel || "Digital Persona U.4500",
        templateFormat: templateFormat || "ANSI-378",
      },
      create: {
        studentId,
        templateData: encryptedTemplate,
        templateType: "FINGERPRINT",
        qualityScore: finalQualityScore || null,
        enrollmentDevice: deviceInfo ? JSON.stringify(deviceInfo) : null,
        scannerModel: scannerModel || "Digital Persona U.4500",
        templateFormat: templateFormat || "ANSI-378",
      },
      include: {
        student: true,
      },
    });

    // Update enrollment flag
    await prisma.student.update({
      where: { id: studentId },
      data: { biometricEnrolled: true },
    });

    logger.info(
      `Biometric enrolled for student: ${biometricTemplate.student.matricNumber} using ${scannerModel || "Digital Persona U.4500"
      }`
    );

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
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/* ============================================================
   VERIFY BIOMETRIC
============================================================ */
router.post("/verify", authenticate, async (req, res) => {
  try {
    const { studentId, biometricData, scannerModel, templateFormat } = req.body;

    if (!studentId || !biometricData) {
      return res.status(400).json({
        success: false,
        message: "Student ID and biometric data are required",
      });
    }

    // ✅ Validate incoming template structure
    let liveTemplate;
    try {
      const parsed = JSON.parse(biometricData);
      if (!parsed.template || !parsed.format) {
        return res.status(400).json({
          success: false,
          message: "Invalid biometric template format - must include 'template' and 'format' keys",
        });
      }
      liveTemplate = parsed.template;

      logger.info('📥 Live template received for verification:', {
        studentId: studentId,
        format: parsed.format,
        templateLength: liveTemplate.length,
        quality: parsed.metadata?.quality || 'unknown'
      });

    } catch (parseError) {
      logger.error('❌ JSON parse failed:', parseError);
      return res.status(400).json({
        success: false,
        message: "Invalid biometric template data - must be valid JSON",
      });
    }

    // ✅ Fetch stored encrypted template from database
    const storedTemplate = await prisma.biometricTemplate.findFirst({
      where: { studentId, templateType: "FINGERPRINT" },
      include: { student: true },
    });

    if (!storedTemplate) {
      return res.status(404).json({
        success: false,
        message: "No biometric template found for this student. Please enroll first.",
      });
    }

    logger.info('📤 Stored template retrieved from database:', {
      studentId: studentId,
      matricNumber: storedTemplate.student.matricNumber,
      studentName: `${storedTemplate.student.firstName} ${storedTemplate.student.lastName}`,
      templateFormat: storedTemplate.templateFormat,
      scannerModel: storedTemplate.scannerModel,
      enrolledAt: storedTemplate.createdAt
    });

    // ✅ Perform verification using enhanced algorithm
    const { matched, confidence } = verifyBiometric(
      biometricData, // Full JSON with template and metadata
      storedTemplate.templateData // Encrypted stored template
    );

    // Log detailed verification result
    logger.info(
      `🔐 Biometric verification complete:\n` +
      `  Student ID: ${studentId}\n` +
      `  Matric No: ${storedTemplate.student.matricNumber}\n` +
      `  Student: ${storedTemplate.student.firstName} ${storedTemplate.student.lastName}\n` +
      `  Result: ${matched ? '✅ MATCHED' : '❌ NOT MATCHED'}\n` +
      `  Confidence: ${confidence.toFixed(2)}%\n` +
      `  Threshold: ${process.env.BIOMETRIC_CONFIDENCE_THRESHOLD || 75}%`
    );

    res.json({
      success: true,
      data: {
        matched,
        confidence,
        studentId,
        templateId: storedTemplate.id,
        student: {
          id: storedTemplate.student.id,
          matricNumber: storedTemplate.student.matricNumber,
          firstName: storedTemplate.student.firstName,
          lastName: storedTemplate.student.lastName,
        },
        verificationDetails: {
          timestamp: new Date().toISOString(),
          scannerModel: scannerModel || 'Digital Persona U.4500',
          templateFormat: templateFormat || 'ANSI-378'
        }
      },
    });
  } catch (error: any) {
    logger.error("❌ Biometric verification error:", error);
    res.status(500).json({
      success: false,
      message: "Biometric verification failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/* ============================================================
   GET BIOMETRIC STATUS
============================================================ */
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

    const latestEnrollment =
      student.biometricTemplates.length > 0
        ? student.biometricTemplates.sort(
          (a, b) =>
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

/* ============================================================
   DELETE BIOMETRIC DATA
============================================================ */
router.delete("/:studentId", authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    const deletedCount = await prisma.biometricTemplate.deleteMany({
      where: { studentId },
    });

    await prisma.student.update({
      where: { id: studentId },
      data: { biometricEnrolled: false },
    });

    logger.info(
      `Deleted ${deletedCount.count} biometric templates for student: ${studentId}`
    );

    res.json({
      success: true,
      message: "Biometric data deleted successfully",
      data: { deletedTemplates: deletedCount.count },
    });
  } catch (error) {
    logger.error("Delete biometric error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete biometric data",
    });
  }
});

/* ============================================================
   TEST ENDPOINT - DEVICE CAPABILITIES
============================================================ */
router.get("/test/device", authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Device check endpoint available",
      data: {
        supportedScanners: ["Digital Persona U.4500"],
        supportedFormats: ["ANSI-378"],
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
