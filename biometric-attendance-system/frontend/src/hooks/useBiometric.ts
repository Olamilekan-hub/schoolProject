// src/hooks/useBiometric.ts - FIXED VERSION
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
  enrollFingerprint: (userId: string) => Promise<BiometricScanResult>
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
      // Check if we're on HTTPS (required for WebAuthn)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.warn('Biometric authentication requires HTTPS')
        setIsSupported(false)
        return
      }

      // Check for WebAuthn support
      const hasWebAuthn = 'credentials' in navigator && 'create' in navigator.credentials
      const hasPublicKey = 'PublicKeyCredential' in window

      if (!hasWebAuthn || !hasPublicKey) {
        setIsSupported(false)
        return
      }

      setIsSupported(true)

      // Check if platform authenticator (Windows Hello, TouchID, etc.) is available
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
      
      // Detect Windows Hello specifically
      const isWindows = platform.toLowerCase().includes('win')
      const hasWindowsHello = isWindows && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      
      return {
        id: 'platform-authenticator',
        name: isWindows ? 'Windows Hello' : 'Platform Authenticator',
        type: 'FINGERPRINT',
        manufacturer: isWindows ? 'Microsoft' : 'Unknown',
        model: platform,
        serialNumber: 'platform-device',
        isConnected: hasWindowsHello,
        capabilities: ['fingerprint', 'platform-authenticator', 'webauthn']
      }
    } catch (error) {
      console.error('Error getting device info:', error)
      return null
    }
  }, [])

  // Enroll a new fingerprint (create credential)
  const enrollFingerprint = useCallback(async (userId: string): Promise<BiometricScanResult> => {
    if (!isSupported || !isAvailable) {
      return {
        success: false,
        message: 'Biometric authentication is not available'
      }
    }

    try {
      // Generate a random challenge
      const challenge = new Uint8Array(32)
      // Ensure crypto.getRandomValues is only called in browser
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(challenge)
      } else {
        throw new Error('crypto.getRandomValues is not available in this environment')
      }

      // User ID as bytes
      const userIdBytes = new TextEncoder().encode(userId)

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Biometric Attendance System',
          id: window.location.hostname
        },
        user: {
          id: userIdBytes,
          name: userId,
          displayName: `Student ${userId}`
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use platform authenticator (Windows Hello)
          userVerification: 'required',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'direct'
      }

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential

      if (credential && credential.response) {
        const response = credential.response as AuthenticatorAttestationResponse
        
        // Convert credential ID to base64 for storage
        const credentialId = Array.from(new Uint8Array(credential.rawId))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        // Get attestation object for template storage
        const attestationObject = Array.from(new Uint8Array(response.attestationObject))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        return {
          success: true,
          message: 'Fingerprint enrolled successfully',
          templateData: attestationObject,
          qualityScore: 95, // High quality for platform authenticators
          confidence: 100,
          deviceInfo: await getDeviceInfo()
        }
      }

      return {
        success: false,
        message: 'Failed to create credential'
      }
    } catch (error: any) {
      let message = 'Fingerprint enrollment failed'
      
      if (error.name === 'NotAllowedError') {
        message = 'User denied permission or cancelled enrollment'
      } else if (error.name === 'NotSupportedError') {
        message = 'Biometric authentication is not supported'
      } else if (error.name === 'SecurityError') {
        message = 'Security error - ensure you are using HTTPS'
      } else if (error.name === 'AbortError') {
        message = 'Enrollment was cancelled'
      }

      return {
        success: false,
        message,
        deviceInfo: await getDeviceInfo()
      }
    }
  }, [isSupported, isAvailable, getDeviceInfo])

  // Verify fingerprint (authenticate with existing credential)
  const startScan = useCallback(async (options: UseBiometricOptions = {}): Promise<BiometricScanResult> => {
    const { timeout = 30000, userPrompt = 'Please verify your fingerprint' } = options

    if (!isSupported || !isAvailable) {
      return {
        success: false,
        message: 'Biometric authentication is not available'
      }
    }

    try {
      // Generate challenge
      const challenge = new Uint8Array(32)
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(challenge)
      } else {
        throw new Error('crypto.getRandomValues is not available in this environment')
      }

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout,
        userVerification: 'required',
        allowCredentials: [] // Allow any registered credential
      }

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential

      if (assertion && assertion.response) {
        const response = assertion.response as AuthenticatorAssertionResponse
        
        // Convert signature to hex for verification
        const signature = Array.from(new Uint8Array(response.signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        // Convert credential ID for identification
        const credentialId = Array.from(new Uint8Array(assertion.rawId))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        return {
          success: true,
          message: 'Fingerprint verified successfully',
          templateData: signature,
          qualityScore: 95,
          confidence: 100,
          deviceInfo: await getDeviceInfo()
        }
      }

      return {
        success: false,
        message: 'Authentication failed'
      }
    } catch (error: any) {
      let message = 'Fingerprint verification failed'
      
      if (error.name === 'NotAllowedError') {
        message = 'User denied permission or no registered fingerprints found'
      } else if (error.name === 'NotSupportedError') {
        message = 'Biometric authentication is not supported'
      } else if (error.name === 'SecurityError') {
        message = 'Security error - ensure you are using HTTPS'
      } else if (error.name === 'AbortError') {
        message = 'Authentication was cancelled'
      } else if (error.name === 'TimeoutError') {
        message = 'Authentication timed out'
      }

      return {
        success: false,
        message,
        deviceInfo: await getDeviceInfo()
      }
    }
  }, [isSupported, isAvailable, getDeviceInfo])

  const stopScan = useCallback(() => {
    // WebAuthn doesn't provide a way to cancel ongoing operations
    // The timeout will handle cancellation
    console.log('Scan cancellation requested - will timeout naturally')
  }, [])

  return {
    isSupported,
    isAvailable,
    deviceInfo,
    startScan,
    stopScan,
    getDeviceInfo,
    enrollFingerprint
  }
}