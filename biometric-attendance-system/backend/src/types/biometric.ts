// src/types/biometric.ts

import type { Student } from "./student"

export interface BiometricTemplate {
  id: string
  studentId: string
  templateData: string
  templateType: BiometricType
  qualityScore?: number
  enrollmentDevice?: Record<string, any>
  createdAt: string
  updatedAt: string
  student?: Student
}

export enum BiometricType {
  FINGERPRINT = 'FINGERPRINT',
  FACE = 'FACE'
}

export interface BiometricScanResult {
  success: boolean
  message: string
  templateData?: string
  qualityScore?: number
  confidence?: number
  deviceInfo?: Record<string, any>
}

export interface BiometricVerificationResult {
  success: boolean
  message: string
  matched: boolean
  confidence: number
  studentId?: string
  templateId?: string
}

export interface BiometricDevice {
  id: string
  name: string
  type: 'FINGERPRINT' | 'FACE' | 'IRIS'
  manufacturer: string
  model: string
  serialNumber: string
  isConnected: boolean
  capabilities: string[]
}