// src/utils/biometric.ts - Biometric Utilities
import crypto from 'crypto'
import { config } from '../config/env'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(config.BIOMETRIC_TEMPLATE_ENCRYPTION_KEY, 'hex')

export const encryptBiometric = (data: string): string => {
  try {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher(ALGORITHM, KEY)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  } catch (error) {
    throw new Error('Failed to encrypt biometric data')
  }
}

export const decryptBiometric = (encryptedData: string): string => {
  try {
    const parts = encryptedData.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    const decipher = crypto.createDecipher(ALGORITHM, KEY)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    throw new Error('Failed to decrypt biometric data')
  }
}

export const verifyBiometric = (inputData: string, storedTemplate: string): { matched: boolean; confidence: number } => {
  try {
    // Mock biometric verification - in real implementation, use actual biometric matching algorithms
    const decryptedTemplate = decryptBiometric(storedTemplate)
    
    // Simple similarity check (mock)
    const similarity = Math.random() * 40 + 60 // 60-100% confidence
    const matched = similarity >= config.BIOMETRIC_CONFIDENCE_THRESHOLD
    
    return {
      matched,
      confidence: Math.round(similarity * 100) / 100
    }
  } catch (error) {
    return {
      matched: false,
      confidence: 0
    }
  }
}