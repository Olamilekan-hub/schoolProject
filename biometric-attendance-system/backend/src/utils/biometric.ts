// src/utils/biometric.ts - Biometric Utilities with Digital Persona U.4500 Support
import crypto from "crypto";
import { config } from "../config/env";
import { logger } from "./logger";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(config.BIOMETRIC_TEMPLATE_ENCRYPTION_KEY, "hex");

// Digital Persona U.4500 Minutiae Template Structure
interface MinutiaePoint {
  x: number;
  y: number;
  angle: number;
  quality: number;
  type: 'ridge_ending' | 'bifurcation';
}

interface BiometricTemplate {
  minutiae: MinutiaePoint[];
  imageWidth: number;
  imageHeight: number;
  dpi: number;
  quality: number;
  metadata: {
    scannerModel: string;
    timestamp: number;
    version: string;
  };
}

// Fixed encryption using proper GCM mode
export const encryptBiometric = (data: string): string => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
  } catch (error) {
    logger.error("Biometric encryption error:", error);
    throw new Error("Failed to encrypt biometric data");
  }
};

export const decryptBiometric = (encryptedData: string): string => {
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    logger.error("Biometric decryption error:", error);
    throw new Error("Failed to decrypt biometric data");
  }
};

// Digital Persona U.4500 Template Verification Algorithm
export const verifyBiometric = (
  inputData: string,
  storedTemplate: string
): { matched: boolean; confidence: number } => {
  try {
    const decryptedTemplate = decryptBiometric(storedTemplate);

    // Parse templates
    const inputTemplate: BiometricTemplate = JSON.parse(inputData);
    const storedTemplateData: BiometricTemplate = JSON.parse(decryptedTemplate);

    // Quality check
    if (inputTemplate.quality < 60 || storedTemplateData.quality < 60) {
      return { matched: false, confidence: 0 };
    }

    // Minutiae matching algorithm (simplified version of what Digital Persona uses)
    const confidence = calculateMinutiaeMatch(inputTemplate, storedTemplateData);
    const matched = confidence >= config.BIOMETRIC_CONFIDENCE_THRESHOLD;

    logger.info(`Biometric verification: matched=${matched}, confidence=${confidence}`);

    return {
      matched,
      confidence: Math.round(confidence * 100) / 100,
    };
  } catch (error) {
    logger.error("Biometric verification error:", error);
    return {
      matched: false,
      confidence: 0,
    };
  }
};

// Minutiae matching algorithm (simplified version)
function calculateMinutiaeMatch(template1: BiometricTemplate, template2: BiometricTemplate): number {
  const tolerance = {
    position: 15, // pixels
    angle: 30, // degrees
  };

  let matchedMinutiae = 0;
  const totalMinutiae = Math.min(template1.minutiae.length, template2.minutiae.length);

  if (totalMinutiae === 0) return 0;

  for (const minutia1 of template1.minutiae) {
    for (const minutia2 of template2.minutiae) {
      if (isMinutiaeMatch(minutia1, minutia2, tolerance)) {
        matchedMinutiae++;
        break; // Each minutia can only match once
      }
    }
  }

  // Calculate confidence based on matched minutiae ratio
  const matchRatio = matchedMinutiae / totalMinutiae;
  const qualityFactor = Math.min(template1.quality, template2.quality) / 100;

  return matchRatio * qualityFactor * 100;
}

function isMinutiaeMatch(
  m1: MinutiaePoint,
  m2: MinutiaePoint,
  tolerance: { position: number; angle: number }
): boolean {
  // Check type match
  if (m1.type !== m2.type) return false;

  // Check position tolerance
  const distance = Math.sqrt(Math.pow(m1.x - m2.x, 2) + Math.pow(m1.y - m2.y, 2));
  if (distance > tolerance.position) return false;

  // Check angle tolerance
  let angleDiff = Math.abs(m1.angle - m2.angle);
  if (angleDiff > 180) angleDiff = 360 - angleDiff; // Handle circular angles
  if (angleDiff > tolerance.angle) return false;

  return true;
}

// Digital Persona U.4500 Mock Template Generator (for testing without hardware)
export const generateMockTemplate = (studentId: string): string => {
  const mockTemplate: BiometricTemplate = {
    minutiae: generateMockMinutiae(),
    imageWidth: 500,
    imageHeight: 500,
    dpi: 500, // U.4500 specification
    quality: Math.floor(Math.random() * 20) + 80, // 80-100
    metadata: {
      scannerModel: "Digital Persona U.4500",
      timestamp: Date.now(),
      version: "1.0.0"
    }
  };

  return JSON.stringify(mockTemplate);
};

function generateMockMinutiae(): MinutiaePoint[] {
  const minutiae: MinutiaePoint[] = [];
  const count = Math.floor(Math.random() * 30) + 20; // 20-50 minutiae points

  for (let i = 0; i < count; i++) {
    minutiae.push({
      x: Math.floor(Math.random() * 500),
      y: Math.floor(Math.random() * 500),
      angle: Math.floor(Math.random() * 360),
      quality: Math.floor(Math.random() * 40) + 60, // 60-100
      type: Math.random() > 0.5 ? 'ridge_ending' : 'bifurcation'
    });
  }

  return minutiae;
}

// Digital Persona U.4500 SDK Integration Layer (will be activated when hardware is connected)
export class DigitalPersonaU4500 {
  private isHardwareConnected = false;
  private deviceInfo = {
    name: "Digital Persona U.4500",
    serialNumber: "",
    firmwareVersion: "",
    status: "disconnected"
  };

  async initialize(): Promise<boolean> {
    try {
      // This will connect to actual Digital Persona SDK when available
      // For now, simulate hardware check
      logger.info("Attempting to initialize Digital Persona U.4500...");

      // TODO: Add actual Digital Persona SDK initialization
      // const sdk = require('digitalpersona-sdk');
      // this.isHardwareConnected = await sdk.initialize();

      // Mock initialization
      this.isHardwareConnected = false; // Set to true when hardware is connected
      this.deviceInfo.status = this.isHardwareConnected ? "connected" : "disconnected";

      logger.info(`Digital Persona U.4500 status: ${this.deviceInfo.status}`);
      return this.isHardwareConnected;
    } catch (error) {
      logger.error("Failed to initialize Digital Persona U.4500:", error);
      return false;
    }
  }

  async captureFingerprint(): Promise<{ success: boolean; template?: string; quality?: number }> {
    if (!this.isHardwareConnected) {
      // Return mock template for testing
      return {
        success: true,
        template: generateMockTemplate("mock-scan"),
        quality: Math.floor(Math.random() * 20) + 80
      };
    }

    try {
      // TODO: Implement actual Digital Persona capture
      // const result = await digitalPersonaSDK.capture();
      // return { success: true, template: result.template, quality: result.quality };

      throw new Error("Hardware capture not implemented yet");
    } catch (error) {
      logger.error("Fingerprint capture error:", error);
      return { success: false };
    }
  }

  getDeviceInfo() {
    return this.deviceInfo;
  }

  isConnected(): boolean {
    return this.isHardwareConnected;
  }
}

// Export singleton instance
export const digitalPersonaScanner = new DigitalPersonaU4500();
