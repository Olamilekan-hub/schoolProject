// src/components/Biometric/FingerprintScanner.tsx - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react'
import { Fingerprint, CheckCircle, XCircle, AlertCircle, Shield, Wifi } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

import type { BiometricScannerProps, BiometricScanResult } from '../../types/components'
import { useBiometric } from '../../hooks/useBiometric'
import Button from '../../components/UI/Button'
import LoadingSpinner from '../../components/UI/LoadingSpinner'

type ScannerState = 'idle' | 'scanning' | 'processing' | 'success' | 'error'

const FingerprintScanner: React.FC<BiometricScannerProps> = ({
  onScanResult,
  onScanStart,
  onScanEnd,
  disabled = false,
  className,
  deviceType = 'FINGERPRINT',
}) => {
  const [scannerState, setScannerState] = useState<ScannerState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  
  const { 
    isSupported, 
    isAvailable, 
    startScan, 
    stopScan, 
    deviceInfo 
  } = useBiometric()

  const maxRetries = 3
  const scanTimeout = 30000 // 30 seconds

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerState === 'scanning') {
        stopScan()
        onScanEnd?.()
      }
    }
  }, [scannerState, stopScan, onScanEnd])

  const resetScanner = useCallback(() => {
    setScannerState('idle')
    setErrorMessage('')
    setRetryCount(0)
  }, [])

  const handleStartScan = useCallback(async () => {
    if (!isSupported) {
      const errorMsg = 'Windows Hello or biometric authentication is not supported on this device'
      toast.error(errorMsg)
      const result: BiometricScanResult = { success: false, message: errorMsg }
      onScanResult(result)
      return
    }

    if (!isAvailable) {
      const errorMsg = 'Windows Hello is not set up or no fingerprints are enrolled. Please set up Windows Hello in Settings.'
      toast.error(errorMsg)
      const result: BiometricScanResult = { success: false, message: errorMsg }
      onScanResult(result)
      return
    }

    if (disabled) return

    try {
      setScannerState('scanning')
      setErrorMessage('')
      onScanStart?.()

      // Show immediate feedback
      toast('Windows Hello prompt should appear...')

      // Start actual biometric authentication
      const scanResult = await startScan({
        timeout: scanTimeout,
        allowFallback: false,
        userPrompt: 'Please verify your fingerprint to mark attendance',
      })

      setScannerState('processing')

      // Brief processing delay for UX
      await new Promise(resolve => setTimeout(resolve, 500))

      if (scanResult.success) {
        setScannerState('success')
        
        const result: BiometricScanResult = {
          success: true,
          message: 'Fingerprint verified successfully',
          templateData: scanResult.templateData,
          qualityScore: scanResult.qualityScore,
          confidence: scanResult.confidence,
          deviceInfo: scanResult.deviceInfo,
        }

        onScanResult(result)
        toast.success('Fingerprint verification successful!')

        // Reset after success
        setTimeout(resetScanner, 2000)
      } else {
        throw new Error(scanResult.message || 'Fingerprint verification failed')
      }
    } catch (error: any) {
      setScannerState('error')
      
      let errorMsg = error.message || 'Fingerprint verification failed'
      
      // Handle specific Windows Hello errors
      if (error.name === 'NotAllowedError') {
        errorMsg = 'Windows Hello access was denied. Please try again or check your Windows Hello settings.'
      } else if (error.name === 'SecurityError') {
        errorMsg = 'Security error. Please ensure you are using HTTPS and Windows Hello is properly configured.'
      } else if (error.name === 'TimeoutError') {
        errorMsg = 'Windows Hello verification timed out. Please try again.'
      } else if (error.name === 'AbortError') {
        errorMsg = 'Windows Hello verification was cancelled.'
      }
      
      setErrorMessage(errorMsg)
      
      const result: BiometricScanResult = {
        success: false,
        message: errorMsg,
        deviceInfo: deviceInfo,
      }

      onScanResult(result)
      toast.error(errorMsg)

      // Allow retry
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          setScannerState('idle')
        }, 2000)
      }
    } finally {
      onScanEnd?.()
    }
  }, [
    isSupported, 
    isAvailable, 
    disabled, 
    startScan, 
    deviceInfo, 
    onScanStart, 
    onScanEnd, 
    onScanResult,
    retryCount,
    resetScanner
  ])

  const handleStopScan = useCallback(() => {
    if (scannerState === 'scanning') {
      stopScan()
      setScannerState('idle')
      onScanEnd?.()
      toast('Windows Hello verification cancelled')
    }
  }, [scannerState, stopScan, onScanEnd])

  const getScannerIcon = () => {
    switch (scannerState) {
      case 'success':
        return <CheckCircle className="h-16 w-16 text-success-500" />
      case 'error':
        return <XCircle className="h-16 w-16 text-error-500" />
      case 'scanning':
        return (
          <div className="relative">
            <Shield className="h-16 w-16 text-primary-500" />
            <div className="absolute inset-0 animate-ping">
              <Shield className="h-16 w-16 text-primary-300" />
            </div>
          </div>
        )
      case 'processing':
        return <LoadingSpinner size="lg" className="text-primary-500" />
      default:
        return <Fingerprint className="h-16 w-16 text-gray-400" />
    }
  }

  const getScannerMessage = () => {
    switch (scannerState) {
      case 'scanning':
        return 'Windows Hello is requesting fingerprint verification...'
      case 'processing':
        return 'Processing fingerprint verification...'
      case 'success':
        return 'Fingerprint verified successfully!'
      case 'error':
        return errorMessage || 'Fingerprint verification failed'
      default:
        return isAvailable 
          ? 'Click to verify your fingerprint with Windows Hello'
          : 'Windows Hello fingerprint not available'
    }
  }

  const getScannerClasses = () => {
    return clsx(
      'biometric-scanner p-8 rounded-lg border-2 transition-all duration-300',
      {
        'border-primary-300 bg-primary-50': scannerState === 'scanning',
        'border-success-300 bg-success-50': scannerState === 'success',
        'border-error-300 bg-error-50': scannerState === 'error',
        'border-gray-300 bg-gray-50': scannerState === 'idle',
        'opacity-50 cursor-not-allowed': disabled || !isAvailable,
      },
      className
    )
  }

  if (!isSupported) {
    return (
      <div className={clsx('biometric-scanner p-8 rounded-lg border-2 border-warning-300 bg-warning-50', className)}>
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-warning-500 mx-auto mb-4" />
          <p className="text-center text-warning-700 mb-4">
            Windows Hello or biometric authentication is not supported on this device or browser.
          </p>
          <div className="text-sm text-warning-600 space-y-2">
            <p><strong>Requirements:</strong></p>
            <ul className="list-disc list-inside text-left">
              <li>Windows 10/11 with Windows Hello enabled</li>
              <li>Fingerprint scanner hardware</li>
              <li>HTTPS connection (required for security)</li>
              <li>Modern browser (Chrome, Edge, Firefox)</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={getScannerClasses()}>
      <div className="text-center">
        <div className="mb-4">
          {getScannerIcon()}
        </div>

        <p className="text-lg font-medium text-gray-900 mb-4">
          {getScannerMessage()}
        </p>

        {/* Device Information */}
        {deviceInfo && (
          <div className="text-xs text-gray-500 mb-4 p-3 bg-gray-100 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Wifi className="h-3 w-3" />
              <span className="font-medium">Device Status</span>
            </div>
            <div className="space-y-1">
              <p>Device: {deviceInfo.name}</p>
              <p>Platform: {deviceInfo.model}</p>
              <p>Status: {deviceInfo.isConnected ? 'Connected' : 'Disconnected'}</p>
            </div>
          </div>
        )}

        {/* Windows Hello Specific Instructions */}
        {scannerState === 'idle' && isAvailable && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Windows Hello Ready</span>
            </div>
            <p>When you click scan, Windows will prompt you to verify your fingerprint.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 justify-center">
          {scannerState === 'idle' && (
            <Button
              onClick={handleStartScan}
              disabled={disabled || !isAvailable}
              variant="primary"
              className="flex items-center space-x-2"
            >
              <Fingerprint className="h-5 w-5" />
              <span>Verify Fingerprint</span>
            </Button>
          )}

          {scannerState === 'scanning' && (
            <Button
              onClick={handleStopScan}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <span>Cancel</span>
            </Button>
          )}

          {scannerState === 'error' && retryCount < maxRetries && (
            <Button
              onClick={() => {
                setScannerState('idle')
                setErrorMessage('')
              }}
              variant="primary"
              className="flex items-center space-x-2"
            >
              <span>Try Again ({maxRetries - retryCount} left)</span>
            </Button>
          )}

          {(scannerState === 'success' || (scannerState === 'error' && retryCount >= maxRetries)) && (
            <Button
              onClick={resetScanner}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <span>Scan Again</span>
            </Button>
          )}
        </div>

        {/* Retry Information */}
        {retryCount > 0 && retryCount < maxRetries && (
          <p className="text-sm text-gray-600 mt-2">
            Attempt {retryCount + 1} of {maxRetries + 1}
          </p>
        )}

        {/* Troubleshooting Help */}
        {scannerState === 'error' && (
          <div className="mt-4 text-sm text-gray-600 bg-gray-100 p-3 rounded-lg">
            <p className="font-medium mb-2">Troubleshooting:</p>
            <ul className="list-disc list-inside text-left space-y-1">
              <li>Ensure Windows Hello is set up in Windows Settings</li>
              <li>Make sure your fingerprint is enrolled</li>
              <li>Check that your browser allows biometric access</li>
              <li>Try using a different finger if available</li>
              <li>Restart your browser if issues persist</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default FingerprintScanner