// src/types/services.ts (Backend)

import { BiometricType } from "./biometric"

export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  attachments?: EmailAttachment[]
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

export interface SMSOptions {
  to: string
  message: string
}

export interface NotificationOptions {
  type: 'email' | 'sms' | 'push'
  recipient: string
  subject?: string
  message: string
  data?: Record<string, any>
}

export interface CryptoOptions {
  algorithm?: string
  key: string
  iv?: string
}

export interface BiometricMatchOptions {
  confidenceThreshold: number
  templateType: BiometricType
  algorithm?: string
}