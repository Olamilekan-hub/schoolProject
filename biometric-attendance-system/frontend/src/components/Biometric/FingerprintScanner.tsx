// src/components/Biometric/FingerprintScanner.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Fingerprint, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
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
  const [scanProgress, setScanProgress] = useState(0)
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
  const scanTimeout = 10000 // 10 seconds

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
    setScanProgress(0)
    setErrorMessage('')
    setRetryCount(0)
  }, [])

  const simulateScanProgress = useCallback(() => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 20
      setScanProgress(Math.min(progress, 95))
      
      if (progress >= 95) {
        clearInterval(interval)
      }
    }, 200)

    return interval
  }, [])

  const handleStartScan = useCallback(async () => {
    if (!isSupported) {
      toast.error('Biometric authentication is not supported on this device')
      return
    }

    if (!isAvailable) {
      toast.error('Biometric device is not available')
      return
    }

    if (disabled) return

    try {
      setScannerState('scanning')
      setScanProgress(0)
      setErrorMessage('')
      onScanStart?.()

      // Start progress simulation
      const progressInterval = simulateScanProgress()

      // Start actual biometric scan
      const scanResult = await startScan({
        timeout: scanTimeout,
        allowFallback: false,
        userPrompt: 'Please place your finger on the scanner',
      })

      clearInterval(progressInterval)
      setScanProgress(100)
      setScannerState('processing')

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (scanResult.success) {
        setScannerState('success')
        
        const result: BiometricScanResult = {
          success: true,
          message: 'Fingerprint captured successfully',
          templateData: scanResult.templateData,
          qualityScore: scanResult.qualityScore,
          confidence: scanResult.confidence,
          deviceInfo: deviceInfo,
        }

        onScanResult(result)
        toast.success('Fingerprint scan successful!')

        // Reset after success
        setTimeout(resetScanner, 2000)
      } else {
        throw new Error(scanResult.message || 'Scan failed')
      }
    } catch (error: any) {
      clearInterval(simulateScanProgress())
      setScannerState('error')
      
      const errorMsg = error.name === 'NotAllowedError' 
        ? 'Biometric access was denied. Please allow access and try again.'
        : error.message || 'Fingerprint scan failed'
      
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
    simulateScanProgress,
    resetScanner
  ])

  const handleStopScan = useCallback(() => {
    if (scannerState === 'scanning') {
      stopScan()
      setScannerState('idle')
      setScanProgress(0)
      onScanEnd?.()
      toast('Fingerprint scan cancelled')
    }
  }, [scannerState, stopScan, onScanEnd])

  const getScannerIcon = () => {
    switch (scannerState) {
      case 'success':
        return <CheckCircle className="h-16 w-16 text-success-500" />
      case 'error':
        return <XCircle className="h-16 w-16 text-error-500" />
      case 'scanning':
      case 'processing':
        return <Fingerprint className="h-16 w-16 text-primary-500 animate-pulse" />
      default:
        return <Fingerprint className="h-16 w-16 text-gray-400" />
    }
  }

  const getScannerMessage = () => {
    switch (scannerState) {
      case 'scanning':
        return 'Place your finger on the scanner and hold still...'
      case 'processing':
        return 'Processing fingerprint data...'
      case 'success':
        return 'Fingerprint captured successfully!'
      case 'error':
        return errorMessage || 'Fingerprint scan failed'
      default:
        return 'Click to start fingerprint scan'
    }
  }

  const getScannerClasses = () => {
    return clsx(
      'biometric-scanner',
      {
        'active': scannerState === 'scanning',
        'success': scannerState === 'success',
        'error': scannerState === 'error',
      },
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )
  }

  if (!isSupported) {
    return (
      <div className={clsx('biometric-scanner', className)}>
        <AlertCircle className="h-16 w-16 text-warning-500 mx-auto mb-4" />
        <p className="text-center text-warning-700">
          Biometric authentication is not supported on this device.
          Please use a device with fingerprint scanner support.
        </p>
      </div>
    )
  }

  return (
    <div className={getScannerClasses()}>
      <div className="text-center">
        <div className="mb-4">
          {getScannerIcon()}
        </div>

        {/* Progress Bar */}
        {(scannerState === 'scanning' || scannerState === 'processing') && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        )}

        <p className="text-lg font-medium text-gray-900 mb-4">
          {getScannerMessage()}
        </p>

        {/* Device Information */}
        {deviceInfo && (
          <div className="text-xs text-gray-500 mb-4">
            <p>Device: {deviceInfo.platform}</p>
            <p>Scanner: {deviceInfo.biometricSupport ? 'Available' : 'Not Available'}</p>
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
              <span>Start Scan</span>
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
              <span>Retry ({maxRetries - retryCount} left)</span>
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

        {/* Help Text */}
        {scannerState === 'idle' && (
          <div className="mt-4 text-sm text-gray-600">
            <p>Tips for better scanning:</p>
            <ul className="list-disc list-inside text-left space-y-1 mt-2">
              <li>Clean your finger and the scanner surface</li>
              <li>Place your finger firmly on the scanner</li>
              <li>Hold still until scanning is complete</li>
              <li>Ensure good lighting conditions</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default FingerprintScanner