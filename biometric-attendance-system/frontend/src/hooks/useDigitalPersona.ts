// src/hooks/useDigitalPersona.ts
import { useState, useEffect, useCallback } from 'react'
import type { BiometricScanResult, BiometricDevice } from '../types/biometric'

interface UseDigitalPersonaOptions {
  timeout?: number
  quality?: number
}

interface UseDigitalPersonaReturn {
  isSupported: boolean
  isConnected: boolean
  deviceInfo: BiometricDevice | null
  startCapture: (options?: UseDigitalPersonaOptions) => Promise<BiometricScanResult>
  stopCapture: () => void
  getDeviceInfo: () => Promise<BiometricDevice | null>
  enrollFingerprint: (userId: string) => Promise<BiometricScanResult>
  verifyFingerprint: (userId: string) => Promise<BiometricScanResult>
}

// Digital Persona U.4500 constants
const DPFP = {
  VENDOR_ID: 0x05ba, // Digital Persona Vendor ID
  PRODUCT_ID: 0x000a, // U.4500 Product ID
  DEVICE_NAME: 'Digital Persona U.4500',
  MIN_QUALITY: 60,
  RECOMMENDED_QUALITY: 80,
  IMAGE_WIDTH: 252,
  IMAGE_HEIGHT: 296,
  DPI: 500
}

export const useDigitalPersona = (): UseDigitalPersonaReturn => {
  const [isSupported, setIsSupported] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<BiometricDevice | null>(null)
  const [currentDevice, setCurrentDevice] = useState<any>(null)

  // Check for Digital Persona SDK and device on mount
  useEffect(() => {
    checkDigitalPersonaSupport()
  }, [])

  const checkDigitalPersonaSupport = useCallback(async () => {
    try {
      // Check if Digital Persona SDK is available
      if (typeof window === 'undefined') {
        setIsSupported(false)
        return
      }

      // Check for Digital Persona Web SDK (ActiveX or Native Messaging)
      const hasDPWebSDK = !!(window as any).Fingerprint || !!(window as any).DigitalPersona

      if (!hasDPWebSDK) {
        console.warn('Digital Persona Web SDK not detected. Please install Digital Persona SDK.')
        setIsSupported(false)
        return
      }

      setIsSupported(true)

      // Try to detect and connect to device
      await detectDevice()
    } catch (error) {
      console.error('Error checking Digital Persona support:', error)
      setIsSupported(false)
      setIsConnected(false)
    }
  }, [])

  const detectDevice = useCallback(async (): Promise<boolean> => {
    try {
      const DP = (window as any).Fingerprint || (window as any).DigitalPersona

      if (!DP) {
        setIsConnected(false)
        return false
      }

      // Get list of connected readers
      const readers = await DP.getDevices()
      
      if (!readers || readers.length === 0) {
        setIsConnected(false)
        setDeviceInfo(null)
        return false
      }

      // Find U.4500 device
      const u4500Device = readers.find((reader: any) => 
        reader.name.includes('U.are.U 4500') || 
        reader.name.includes('U4500') ||
        reader.DeviceID === DPFP.PRODUCT_ID
      )

      if (u4500Device) {
        setCurrentDevice(u4500Device)
        setIsConnected(true)
        
        const info: BiometricDevice = {
          id: u4500Device.DeviceID || 'dp-u4500',
          name: DPFP.DEVICE_NAME,
          type: 'FINGERPRINT',
          manufacturer: 'Digital Persona',
          model: 'U.are.U 4500',
          serialNumber: u4500Device.SerialNumber || 'N/A',
          isConnected: true,
          capabilities: ['fingerprint', 'enrollment', 'verification', 'minutiae-extraction']
        }
        
        setDeviceInfo(info)
        return true
      }

      setIsConnected(false)
      return false
    } catch (error) {
      console.error('Error detecting Digital Persona device:', error)
      setIsConnected(false)
      return false
    }
  }, [])

  const getDeviceInfo = useCallback(async (): Promise<BiometricDevice | null> => {
    await detectDevice()
    return deviceInfo
  }, [deviceInfo, detectDevice])

  // Capture fingerprint sample
  const startCapture = useCallback(async (
    options: UseDigitalPersonaOptions = {}
  ): Promise<BiometricScanResult> => {
    const { timeout = 30000, quality = DPFP.RECOMMENDED_QUALITY } = options

    if (!isSupported) {
      return {
        success: false,
        message: 'Digital Persona U.4500 SDK is not installed or supported'
      }
    }

    if (!isConnected) {
      // Try to reconnect
      const connected = await detectDevice()
      if (!connected) {
        return {
          success: false,
          message: 'Digital Persona U.4500 device not connected. Please connect the device and try again.'
        }
      }
    }

    try {
      const DP = (window as any).Fingerprint || (window as any).DigitalPersona
      
      // Start acquisition
      const acquisitionResult = await Promise.race([
        DP.acquire({
          reader: currentDevice,
          quality: quality
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ])

      if (!acquisitionResult || !acquisitionResult.Data) {
        return {
          success: false,
          message: 'Failed to capture fingerprint. Please try again.'
        }
      }

      // Extract minutiae template
      const template = await DP.createTemplate(acquisitionResult.Data)

      if (!template) {
        return {
          success: false,
          message: 'Failed to create fingerprint template'
        }
      }

      // Calculate quality score
      const qualityScore = acquisitionResult.Quality || quality

      return {
        success: true,
        message: 'Fingerprint captured successfully',
        templateData: JSON.stringify({
          template: template,
          format: 'ANSI-378',
          width: DPFP.IMAGE_WIDTH,
          height: DPFP.IMAGE_HEIGHT,
          dpi: DPFP.DPI,
          quality: qualityScore
        }),
        qualityScore: qualityScore,
        confidence: qualityScore >= DPFP.RECOMMENDED_QUALITY ? 95 : 75,
        deviceInfo: deviceInfo
      }
    } catch (error: any) {
      let message = 'Fingerprint capture failed'
      
      if (error.message === 'Timeout') {
        message = 'Fingerprint capture timed out. Please try again.'
      } else if (error.message?.includes('cancelled')) {
        message = 'Fingerprint capture was cancelled'
      } else if (error.message?.includes('quality')) {
        message = 'Fingerprint quality too low. Please clean your finger and try again.'
      }

      return {
        success: false,
        message,
        deviceInfo: deviceInfo
      }
    }
  }, [isSupported, isConnected, currentDevice, deviceInfo, detectDevice])

  const stopCapture = useCallback(() => {
    try {
      const DP = (window as any).Fingerprint || (window as any).DigitalPersona
      if (DP && DP.stopAcquisition) {
        DP.stopAcquisition()
      }
    } catch (error) {
      console.error('Error stopping capture:', error)
    }
  }, [])

  // Enroll fingerprint (multiple captures for better accuracy)
  const enrollFingerprint = useCallback(async (userId: string): Promise<BiometricScanResult> => {
    if (!isSupported || !isConnected) {
      return {
        success: false,
        message: 'Digital Persona device not available'
      }
    }

    try {
      const DP = (window as any).Fingerprint || (window as any).DigitalPersona
      
      // Capture multiple samples (typically 4) for enrollment
      const samples = []
      const requiredSamples = 4

      for (let i = 0; i < requiredSamples; i++) {
        const result = await startCapture({ quality: DPFP.RECOMMENDED_QUALITY })
        
        if (!result.success || !result.templateData) {
          return {
            success: false,
            message: `Failed to capture sample ${i + 1} of ${requiredSamples}`
          }
        }

        samples.push(JSON.parse(result.templateData).template)
      }

      // Create enrollment template from samples
      const enrollmentTemplate = await DP.createEnrollmentTemplate(samples)

      if (!enrollmentTemplate) {
        return {
          success: false,
          message: 'Failed to create enrollment template'
        }
      }

      return {
        success: true,
        message: 'Fingerprint enrollment completed successfully',
        templateData: JSON.stringify({
          template: enrollmentTemplate,
          format: 'ANSI-378',
          width: DPFP.IMAGE_WIDTH,
          height: DPFP.IMAGE_HEIGHT,
          dpi: DPFP.DPI,
          userId: userId,
          enrollmentDate: new Date().toISOString()
        }),
        qualityScore: 95,
        confidence: 100,
        deviceInfo: deviceInfo
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Fingerprint enrollment failed',
        deviceInfo: deviceInfo
      }
    }
  }, [isSupported, isConnected, startCapture, deviceInfo])

  // Verify fingerprint against stored template
  const verifyFingerprint = useCallback(async (userId: string): Promise<BiometricScanResult> => {
    if (!isSupported || !isConnected) {
      return {
        success: false,
        message: 'Digital Persona device not available'
      }
    }

    try {
      // Capture current fingerprint
      const captureResult = await startCapture({ quality: DPFP.MIN_QUALITY })
      
      if (!captureResult.success) {
        return captureResult
      }

      // Note: Actual verification happens on the backend
      // This just captures the template for verification
      return {
        success: true,
        message: 'Fingerprint captured for verification',
        templateData: captureResult.templateData,
        qualityScore: captureResult.qualityScore,
        confidence: captureResult.confidence,
        deviceInfo: deviceInfo
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Fingerprint verification failed',
        deviceInfo: deviceInfo
      }
    }
  }, [isSupported, isConnected, startCapture, deviceInfo])

  return {
    isSupported,
    isConnected,
    deviceInfo,
    startCapture,
    stopCapture,
    getDeviceInfo,
    enrollFingerprint,
    verifyFingerprint
  }
}