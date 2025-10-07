// frontend/src/hooks/useDigitalPersona.ts
// FIXED VERSION - Dynamic Quality Scores

import { useState, useEffect, useCallback, useRef } from 'react'
import { FingerprintReader, SampleFormat } from '@digitalpersona/devices'
import type { BiometricScanResult, BiometricDevice } from '../types/biometric'

interface UseDigitalPersonaReturn {
  isSupported: boolean
  isConnected: boolean
  deviceInfo: BiometricDevice | null
  startCapture: () => Promise<BiometricScanResult>
  stopCapture: () => void
  enrollFingerprint: (userId: string, requiredScans?: number) => Promise<BiometricScanResult>
  getDeviceInfo: any
  error: string | null
  isCapturing: boolean
}

export const useDigitalPersona = (): UseDigitalPersonaReturn => {
  const [isSupported, setIsSupported] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<BiometricDevice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const readerRef = useRef<FingerprintReader | null>(null)
  const captureResolveRef = useRef<any>(null)
  const captureRejectRef = useRef<any>(null)

  useEffect(() => {
    const initReader = async () => {
      try {
        console.log('Initializing Digital Persona reader...')

        const reader = new FingerprintReader()
        readerRef.current = reader

        reader.on('DeviceConnected', (event: any) => {
          console.log('Device connected:', event)
          setIsConnected(true)
          setError(null)

          setDeviceInfo({
            id: event.deviceUid || 'dp-device',
            name: 'Digital Persona U.are.U 4500',
            type: 'FINGERPRINT',
            manufacturer: 'HID Global',
            model: 'U.are.U 4500 (WBF)',
            serialNumber: event.deviceUid || 'N/A',
            isConnected: true,
            capabilities: ['fingerprint', 'enrollment', 'verification']
          })
        })

        reader.on('DeviceDisconnected', (event: any) => {
          console.log('Device disconnected:', event)
          setIsConnected(false)
          setDeviceInfo(null)
          setError('Device disconnected')
        })

        reader.on('SamplesAcquired', (event: any) => {
          console.log('Samples acquired:', event)
          setIsCapturing(false)

          if (captureResolveRef.current && event.samples && event.samples.length > 0) {
            const sample = event.samples[0]
            const biometricData = sample.Data

            if (!biometricData || typeof biometricData !== 'string') {
              console.error('❌ Invalid sample data:', sample)
              if (captureRejectRef.current) {
                captureRejectRef.current(new Error('Invalid biometric data received'))
                captureResolveRef.current = null
                captureRejectRef.current = null
              }
              return
            }

            // ✅ FIX: Get actual quality from device or calculate from data quality
            const rawQuality = sample.Header?.Quality || -1
            
            // If device doesn't provide quality, use a reasonable estimate based on data
            // Digital Persona often returns -1 when quality metrics aren't available
            let actualQuality: number
            
            if (rawQuality !== -1 && rawQuality >= 0 && rawQuality <= 100) {
              // Use device-provided quality if available
              actualQuality = rawQuality
            } else {
              // Estimate quality based on template data length and completeness
              // Longer templates generally indicate better captures
              const minLength = 300  // Minimum expected template length
              const maxLength = 600  // Maximum typical template length
              const dataLength = biometricData.length
              
              // Calculate quality score based on data completeness (60-100 range)
              if (dataLength < minLength) {
                actualQuality = 60 + Math.floor((dataLength / minLength) * 30)
              } else if (dataLength > maxLength) {
                actualQuality = 95
              } else {
                actualQuality = 60 + Math.floor(((dataLength - minLength) / (maxLength - minLength)) * 35)
              }
              
              console.warn('⚠️ Quality unavailable from device, estimated from data:', actualQuality)
            }

            console.log('📊 Quality score handling:', {
              rawQuality: rawQuality,
              finalQuality: actualQuality,
              dataLength: biometricData.length,
              isEstimated: rawQuality === -1
            })

            // ✅ FIX: Calculate confidence based on quality
            // Higher quality scans = higher confidence
            // Quality ranges: 0-59 = Poor, 60-74 = Fair, 75-89 = Good, 90-100 = Excellent
            const confidence = Math.min(100, Math.floor(actualQuality * 1.05)) // Slight boost for confidence

            const templateData = JSON.stringify({
              template: biometricData,
              format: 'ANSI-378',
              metadata: {
                quality: actualQuality,
                qualityUnavailable: rawQuality === -1,
                type: sample.Header?.Type || 2,
                version: sample.Version || 1,
                deviceId: event.deviceId,
                timestamp: new Date().toISOString()
              }
            })

            console.log('✅ Template created:', {
              rawTemplateLength: biometricData.length,
              quality: actualQuality,
              confidence: confidence,
              format: 'ANSI-378'
            })

            captureResolveRef.current({
              success: true,
              message: 'Fingerprint captured successfully',
              templateData: templateData,
              qualityScore: actualQuality,  // ✅ Dynamic quality
              confidence: confidence,        // ✅ Dynamic confidence based on quality
              deviceInfo: deviceInfo
            })

            captureResolveRef.current = null
            captureRejectRef.current = null
          }
        })

        reader.on('QualityReported', (event: any) => {
          console.log('Quality reported:', event.quality)
        })

        reader.on('ErrorOccurred', (event: any) => {
          console.error('Reader error:', event)
          setIsCapturing(false)
          setError(event.error || 'Reader error occurred')

          if (captureRejectRef.current) {
            captureRejectRef.current(new Error(event.error || 'Capture failed'))
            captureResolveRef.current = null
            captureRejectRef.current = null
          }
        })

        setIsSupported(true)
        console.log('Reader initialized successfully')

      } catch (err: any) {
        console.error('Failed to initialize reader:', err)
        setIsSupported(false)

        if (err.message?.includes('Cannot connect')) {
          setError('Cannot connect to Digital Persona service. Please ensure HID Authentication Device Client is installed and running.')
        } else {
          setError(err.message || 'Failed to initialize fingerprint reader')
        }
      }
    }

    const timer = setTimeout(initReader, 1000)

    return () => {
      clearTimeout(timer)
      if (readerRef.current) {
        try {
          readerRef.current.stopAcquisition()
        } catch (e) {
          // Ignore
        }
      }
    }
  }, [])

  const startCapture = useCallback(async (): Promise<BiometricScanResult> => {
    if (!isSupported) {
      return {
        success: false,
        message: 'Digital Persona not supported. Please install HID Authentication Device Client with WBF driver.'
      }
    }

    if (!isConnected) {
      return {
        success: false,
        message: 'Device not connected. Please ensure Digital Persona U.4500 is plugged in.'
      }
    }

    if (isCapturing) {
      return {
        success: false,
        message: 'Already capturing. Please wait.'
      }
    }

    if (!readerRef.current) {
      return {
        success: false,
        message: 'Reader not initialized'
      }
    }

    try {
      setIsCapturing(true)
      setError(null)

      await readerRef.current.startAcquisition(SampleFormat.Intermediate)

      return new Promise((resolve, reject) => {
        captureResolveRef.current = resolve
        captureRejectRef.current = reject

        setTimeout(() => {
          if (captureResolveRef.current) {
            setIsCapturing(false)
            readerRef.current?.stopAcquisition()
            reject(new Error('Capture timed out after 30 seconds'))
            captureResolveRef.current = null
            captureRejectRef.current = null
          }
        }, 30000)
      })
    } catch (err: any) {
      setIsCapturing(false)
      const errorMsg = err.message || 'Failed to start capture'
      setError(errorMsg)

      return {
        success: false,
        message: errorMsg,
        deviceInfo: deviceInfo
      }
    }
  }, [isSupported, isConnected, isCapturing, deviceInfo])

  const stopCapture = useCallback(() => {
    if (readerRef.current && isCapturing) {
      try {
        readerRef.current.stopAcquisition()
        setIsCapturing(false)

        if (captureRejectRef.current) {
          captureRejectRef.current(new Error('Capture cancelled'))
          captureResolveRef.current = null
          captureRejectRef.current = null
        }
      } catch (err) {
        console.error('Error stopping capture:', err)
      }
    }
  }, [isCapturing])

  const enrollFingerprint = useCallback(async (
    userId: string,
    requiredScans: number = 4
  ): Promise<BiometricScanResult> => {
    if (!isSupported || !isConnected) {
      return {
        success: false,
        message: 'Device not available'
      }
    }

    try {
      const templates: string[] = []
      const qualities: number[] = []

      for (let i = 0; i < requiredScans; i++) {
        console.log(`📸 Capturing scan ${i + 1} of ${requiredScans}...`)

        const result = await startCapture()

        if (!result.success) {
          return {
            success: false,
            message: `Failed at scan ${i + 1}: ${result.message}`
          }
        }

        if (result.templateData) {
          try {
            const parsed = JSON.parse(result.templateData)

            console.log(`🔍 Scan ${i + 1} parsed:`, {
              hasTemplate: !!parsed.template,
              templateLength: parsed.template?.length,
              quality: parsed.metadata?.quality,
              format: parsed.format
            })

            if (!parsed.template) {
              console.error('❌ No template in parsed data:', parsed)
              return {
                success: false,
                message: `Invalid template structure at scan ${i + 1}`
              }
            }

            templates.push(parsed.template)
            qualities.push(parsed.metadata?.quality || 70) // Use actual quality or fallback to 70
          } catch (parseError) {
            console.error('❌ Failed to parse template data:', parseError)
            return {
              success: false,
              message: `Failed to parse scan ${i + 1} data`
            }
          }
        }

        if (i < requiredScans - 1) {
          console.log('⏳ Remove finger and wait...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Use the best quality template
      const bestIndex = qualities.indexOf(Math.max(...qualities))
      const bestTemplate = templates[bestIndex]
      const averageQuality = Math.round(qualities.reduce((a, b) => a + b, 0) / qualities.length)

      console.log('📊 All scans complete:', {
        totalScans: templates.length,
        qualities: qualities,
        averageQuality: averageQuality,
        bestIndex: bestIndex,
        bestQuality: qualities[bestIndex],
        bestTemplateLength: bestTemplate.length
      })

      // Create final enrollment data
      const enrollmentData = JSON.stringify({
        template: bestTemplate,
        format: 'ANSI-378',
        metadata: {
          userId: userId,
          scanCount: requiredScans,
          allQualities: qualities,
          bestQuality: qualities[bestIndex],
          averageQuality: averageQuality,
          enrollmentDate: new Date().toISOString()
        }
      })

      const finalCheck = JSON.parse(enrollmentData)
      console.log('🔍 Final enrollment data check:', {
        hasTemplate: !!finalCheck.template,
        templateLength: finalCheck.template?.length,
        bestQuality: qualities[bestIndex],
        averageQuality: averageQuality,
        format: finalCheck.format
      })

      // ✅ FIX: Use actual quality scores, not hardcoded 100
      const finalConfidence = Math.min(100, Math.floor(averageQuality * 1.05))

      console.log('✅ Enrollment complete:', {
        scans: requiredScans,
        bestQuality: qualities[bestIndex],
        averageQuality: averageQuality,
        confidence: finalConfidence,
        finalDataLength: enrollmentData.length
      })

      return {
        success: true,
        message: `Enrollment completed with ${requiredScans} scans`,
        templateData: enrollmentData,
        qualityScore: averageQuality,     // ✅ Use actual average quality
        confidence: finalConfidence,       // ✅ Calculate from quality
        deviceInfo: deviceInfo
      }
    } catch (err: any) {
      console.error('❌ Enrollment error:', err)
      return {
        success: false,
        message: err.message || 'Enrollment failed',
        deviceInfo: deviceInfo
      }
    }
  }, [isSupported, isConnected, startCapture, deviceInfo])

  const getDeviceInfo = useCallback(async (): Promise<BiometricDevice | null> => {
    try {
      if (!readerRef.current) {
        const reader = new FingerprintReader();
        readerRef.current = reader;
      }

      if (isConnected && deviceInfo) {
        return deviceInfo;
      }

      await readerRef.current.enumerateDevices?.().then((devices: any) => {
        if (devices && devices.length > 0) {
          const dev = devices[0];
          setDeviceInfo({
            id: dev.uid || 'dp-device',
            name: 'Digital Persona U.are.U 4500',
            type: 'FINGERPRINT',
            manufacturer: 'HID Global',
            model: 'U.are.U 4500 (WBF)',
            serialNumber: dev.uid || 'N/A',
            isConnected: true,
            capabilities: ['fingerprint', 'enrollment', 'verification'],
          });
          setIsConnected(true);
          setError(null);
        } else {
          setIsConnected(false);
          setDeviceInfo(null);
        }
      });

      return deviceInfo;
    } catch (err: any) {
      console.error('getDeviceInfo() failed:', err);
      setIsConnected(false);
      setDeviceInfo(null);
      setError(err.message || 'Unable to fetch device info');
      return null;
    }
  }, [deviceInfo, isConnected]);

  return {
    isSupported,
    isConnected,
    deviceInfo,
    startCapture,
    stopCapture,
    enrollFingerprint,
    getDeviceInfo,
    error,
    isCapturing
  }
}