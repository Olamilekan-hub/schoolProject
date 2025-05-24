// src/hooks/useBiometric.ts
import { useState, useEffect, useCallback } from 'react'
import type { BiometricScanResult, BiometricDevice } from '../types/biometric'

interface UseBiometricOptions {
  timeout?: number
  allowFallback?: boolean
  userPrompt?: string
}

interface UseBiometricReturn {
  isSupported: boolean
  isAvailable: boolean
  deviceInfo: BiometricDevice | null
  startScan: (options?: UseBiometricOptions) => Promise<BiometricScanResult>
  stopScan: () => void
  getDeviceInfo: () => Promise<BiometricDevice | null>
}

export const useBiometric = (): UseBiometricReturn => {
  const [isSupported, setIsSupported] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<BiometricDevice | null>(null)

  // Check biometric support on mount
  useEffect(() => {
    checkBiometricSupport()
  }, [])

  const checkBiometricSupport = useCallback(async () => {
    try {
      // Check for WebAuthn support
      const hasWebAuthn = 'credentials' in navigator && 'create' in navigator.credentials
      
      // Check for PublicKeyCredential support
      const hasPublicKey = 'PublicKeyCredential' in window
      
      // Check for user gesture requirement
      const hasUserActivation = 'userActivation' in navigator
      
      const supported = hasWebAuthn && hasPublicKey
      setIsSupported(supported)

      if (supported) {
        // Check if biometric authentication is available
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          setIsAvailable(available)
          
          if (available) {
            const info = await getDeviceInfo()
            setDeviceInfo(info)
          }
        } catch (error) {
          console.warn('Could not check biometric availability:', error)
          setIsAvailable(false)
        }
      }
    } catch (error) {
      console.error('Error checking biometric support:', error)
      setIsSupported(false)
      setIsAvailable(false)
    }
  }, [])

  const getDeviceInfo = useCallback(async (): Promise<BiometricDevice | null> => {
    try {
      const userAgent = navigator.userAgent
      const platform = navigator.platform
      const vendor = navigator.vendor || 'Unknown'
      
      // Detect device capabilities
      const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const biometricSupport = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      
      return {
        id: 'platform-authenticator',
        name: 'Platform Authenticator',
        type: 'FINGERPRINT',
        manufacturer: vendor,
        model: platform,
        serialNumber: 'unknown',
        isConnected: biometricSupport,
        capabilities: [
          'fingerprint',
          touchSupport ? 'touch' : 'no-touch',
          'webauthn'
        ]
      }
    } catch (error) {
      console.error('Error getting device info:', error)
      return null
    }
  }, [])

  const startScan = useCallback(async (options: UseBiometricOptions = {}): Promise<BiometricScanResult> => {
    const {
      timeout = 30000,
      allowFallback = false,
      userPrompt = 'Please verify your identity using biometric authentication'
    } = options

    if (!isSupported) {
      return {
        success: false,
        message: 'Biometric authentication is not supported on this device'
      }
    }

    if (!isAvailable) {
      return {
        success: false,
        message: 'Biometric authentication is not available'
      }
    }

    try {
      // Generate a random challenge
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // Create credential request options
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout,
        userVerification: 'required',
        allowCredentials: []
      }

      // Request biometric authentication
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'Biometric Attendance System',
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode('user-id'),
            name: 'user@example.com',
            displayName: 'User'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false
          },
          timeout
        }
      }) as PublicKeyCredential

      if (credential) {
        // Extract biometric data (in real implementation, this would be processed differently)
        const response = credential.response as AuthenticatorAttestationResponse
        const templateData = Array.from(new Uint8Array(response.clientDataJSON))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        // Simulate quality and confidence scores
        const qualityScore = 85 + Math.random() * 15 // 85-100%
        const confidence = 80 + Math.random() * 20 // 80-100%

        const info = await getDeviceInfo()
        return {
          success: true,
          message: 'Biometric scan successful',
          templateData,
          qualityScore,
          confidence,
          ...(info ? { deviceInfo: info } : {})
        }
      } else {
        return {
          success: false,
          message: 'Biometric authentication was cancelled or failed'
        }
      }
    } catch (error: any) {
      console.error('Biometric scan error:', error)
      
      let message = 'Biometric scan failed'
      if (error.name === 'NotAllowedError') {
        message = 'Biometric access was denied'
      } else if (error.name === 'AbortError') {
        message = 'Biometric scan was cancelled'
      } else if (error.name === 'NotSupportedError') {
        message = 'Biometric authentication is not supported'
      } else if (error.name === 'SecurityError') {
        message = 'Security error during biometric scan'
      } else if (error.name === 'TimeoutError') {
        message = 'Biometric scan timed out'
      }
      const info = await getDeviceInfo()
      return {
        success: false,
        message,
        ...(info ? { deviceInfo: info } : {})
      }
    }
  }, [isSupported, isAvailable, getDeviceInfo])

  const stopScan = useCallback(() => {
    // In a real implementation, this would cancel any ongoing biometric operations
    console.log('Stopping biometric scan...')
  }, [])

  return {
    isSupported,
    isAvailable,
    deviceInfo,
    startScan,
    stopScan,
    getDeviceInfo
  }
}