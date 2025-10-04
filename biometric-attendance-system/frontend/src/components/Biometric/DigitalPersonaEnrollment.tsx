// src/components/Biometric/DigitalPersonaEnrollment.tsx
import React, { useState } from 'react'
import { User, Fingerprint, CheckCircle, Usb } from 'lucide-react'
import toast from 'react-hot-toast'

import type { Student, BiometricEnrollmentData } from '../../types/student'
import type { BiometricScanResult } from '../../types/components'
import DigitalPersonaScanner from './DigitalPersonaScanner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import { biometricService } from '../../services/biometric'

interface DigitalPersonaEnrollmentProps {
  student: Student
  isOpen: boolean
  onClose: () => void
  onEnrollmentComplete: (student: Student) => void
}

const DigitalPersonaEnrollment: React.FC<DigitalPersonaEnrollmentProps> = ({
  student,
  isOpen,
  onClose,
  onEnrollmentComplete,
}) => {
  const [enrollmentStep, setEnrollmentStep] = useState<'info' | 'scan' | 'confirm' | 'complete'>('info')
  const [biometricData, setBiometricData] = useState<BiometricScanResult | null>(null)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [scansCompleted, setScansCompleted] = useState(0)
  const [allScans, setAllScans] = useState<string[]>([])
  const requiredScans = 4

  const handleScanResult = (result: BiometricScanResult) => {
    if (result.success && result.templateData) {
      // Store this scan
      setAllScans(prev => [...prev, result.templateData!])
      setBiometricData(result)
      setScansCompleted(prev => prev + 1)
      
      if (scansCompleted + 1 >= requiredScans) {
        setEnrollmentStep('confirm')
        toast.success(`All ${requiredScans} scans completed successfully!`)
      } else {
        toast.success(`Scan ${scansCompleted + 1} of ${requiredScans} completed. Place your finger again for scan ${scansCompleted + 2}.`)
      }
    } else {
      toast.error(result.message)
    }
  }

  const handleEnrollment = async () => {
    if (!biometricData || allScans.length < requiredScans) {
      toast.error('Not enough scans completed')
      return
    }

    setIsEnrolling(true)
    try {
      // Combine all scans into enrollment data
      const enrollmentData: BiometricEnrollmentData = {
        studentId: student.id,
        biometricData: JSON.stringify({
          scans: allScans,
          scanCount: requiredScans,
          finalTemplate: biometricData.templateData
        }),
        deviceInfo: biometricData.deviceInfo,
        qualityScore: biometricData.qualityScore,
      }

      const updatedStudent = await biometricService.enrollBiometric(enrollmentData)
      
      setEnrollmentStep('complete')
      toast.success('Biometric enrollment completed successfully!')
      
      setTimeout(() => {
        onEnrollmentComplete(updatedStudent)
        onClose()
        resetEnrollment()
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || 'Enrollment failed')
      setEnrollmentStep('scan')
    } finally {
      setIsEnrolling(false)
    }
  }

  const resetEnrollment = () => {
    setEnrollmentStep('info')
    setBiometricData(null)
    setScansCompleted(0)
    setAllScans([])
    setIsEnrolling(false)
  }

  const handleClose = () => {
    if (enrollmentStep === 'scan' && scansCompleted > 0) {
      if (!window.confirm('Enrollment is in progress. Are you sure you want to cancel?')) {
        return
      }
    }
    resetEnrollment()
    onClose()
  }

  const renderStepContent = () => {
    switch (enrollmentStep) {
      case 'info':
        return (
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-primary-100">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Digital Persona Biometric Enrollment
              </h3>
              <p className="mt-2 text-gray-600">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-sm text-gray-500">
                Matric No: {student.matricNumber}
              </p>
            </div>

            <div className="p-4 text-left rounded-lg bg-blue-50">
              <h4 className="flex items-center mb-2 font-medium text-blue-900">
                <Fingerprint className="w-4 h-4 mr-2" />
                Enrollment Process:
              </h4>
              <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
                <li>Connect your Digital Persona U.4500 fingerprint scanner via USB</li>
                <li>You'll scan the same finger {requiredScans} times for accuracy</li>
                <li>Place your finger flat on the scanner surface each time</li>
                <li>The system will create a secure biometric template</li>
                <li>Use this enrolled finger for attendance marking</li>
              </ol>
            </div>

            <div className="p-4 text-left rounded-lg bg-green-50">
              <h4 className="flex items-center mb-2 font-medium text-green-900">
                <CheckCircle className="w-4 h-4 mr-2" />
                Digital Persona U.4500 Features:
              </h4>
              <ul className="space-y-1 text-sm text-green-800 list-disc list-inside">
                <li>500 DPI optical sensor for high accuracy</li>
                <li>ANSI-378 compliant minutiae template extraction</li>
                <li>Secure biometric data encryption</li>
                <li>Industry-leading false acceptance rate (FAR)</li>
              </ul>
            </div>

            <div className="p-4 text-left rounded-lg bg-yellow-50">
              <h4 className="mb-2 font-medium text-yellow-900">Privacy & Security:</h4>
              <ul className="space-y-1 text-sm text-yellow-800 list-disc list-inside">
                <li>Only fingerprint templates (minutiae points) are stored, never images</li>
                <li>Templates are encrypted using AES-256-GCM encryption</li>
                <li>Data cannot be reverse-engineered to recreate fingerprints</li>
                <li>You can request deletion of your biometric data anytime</li>
                <li>Used solely for attendance verification purposes</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <Button variant="secondary" onClick={handleClose} fullWidth>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={() => setEnrollmentStep('scan')}
                fullWidth
              >
                Start Enrollment
              </Button>
            </div>
          </div>
        )

      case 'scan':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Fingerprint Scanning
              </h3>
              <p className="mt-1 text-gray-600">
                Scan {scansCompleted} of {requiredScans} completed
              </p>
              <div className="flex justify-center mt-3 space-x-2">
                {Array.from({ length: requiredScans }).map((_, index) => (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all ${
                      index < scansCompleted 
                        ? 'bg-success-500 scale-110' 
                        : index === scansCompleted
                        ? 'bg-primary-500 animate-pulse'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-50">
              <div className="flex items-start space-x-3">
                <Usb className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="mb-1 font-medium">Tips for best results:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Use the same finger for all {requiredScans} scans</li>
                    <li>Place your finger flat and centered on the scanner</li>
                    <li>Keep your finger still during scanning</li>
                    <li>Ensure your finger is clean and dry</li>
                    <li>Apply moderate pressure - not too hard or soft</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* KEY FIX: Show the scanner component here */}
            <DigitalPersonaScanner
              onScanResult={handleScanResult}
              mode="capture"
              className="max-w-md mx-auto"
            />

            <div className="flex space-x-4">
              <Button variant="secondary" onClick={handleClose} fullWidth>
                Cancel
              </Button>
              {scansCompleted > 0 && scansCompleted < requiredScans && (
                <Button 
                  variant="warning" 
                  onClick={() => {
                    setScansCompleted(0)
                    setAllScans([])
                    setBiometricData(null)
                    toast.info('Enrollment reset. Please start over.')
                  }}
                  fullWidth
                >
                  Reset ({scansCompleted} scans)
                </Button>
              )}
            </div>
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-success-100">
              <CheckCircle className="w-8 h-8 text-success-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Enrollment
              </h3>
              <p className="mt-2 text-gray-600">
                All {requiredScans} fingerprint scans completed successfully
              </p>
            </div>

            {biometricData && (
              <div className="p-4 text-left rounded-lg bg-gray-50">
                <h4 className="mb-3 font-medium text-gray-900">Scan Quality Report:</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-white rounded">
                    <p className="text-gray-600">Quality Score</p>
                    <p className="text-xl font-bold text-gray-900">
                      {biometricData.qualityScore?.toFixed(0)}%
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded">
                    <p className="text-gray-600">Confidence</p>
                    <p className="text-xl font-bold text-gray-900">
                      {biometricData.confidence?.toFixed(0)}%
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded">
                    <p className="text-gray-600">Scans Completed</p>
                    <p className="text-xl font-bold text-gray-900">
                      {scansCompleted}/{requiredScans}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded">
                    <p className="text-gray-600">Device</p>
                    <p className="text-sm font-medium text-gray-900">
                      {biometricData.deviceInfo?.model || 'U.4500'}
                    </p>
                  </div>
                </div>
                
                {biometricData.deviceInfo && (
                  <div className="p-3 mt-3 text-xs text-gray-600 bg-white rounded">
                    <p><strong>Device Info:</strong></p>
                    <p>Name: {biometricData.deviceInfo.name}</p>
                    <p>Manufacturer: {biometricData.deviceInfo.manufacturer}</p>
                    {biometricData.deviceInfo.serialNumber !== 'N/A' && (
                      <p>Serial: {biometricData.deviceInfo.serialNumber}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="p-4 text-sm text-green-800 rounded-lg bg-green-50">
              <p className="mb-2 font-medium">Ready to complete enrollment</p>
              <p>
                The biometric template will be encrypted and securely stored. 
                The student will be able to mark attendance using this enrolled fingerprint.
              </p>
            </div>

            <div className="flex space-x-4">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setEnrollmentStep('scan')
                  setScansCompleted(0)
                  setAllScans([])
                  setBiometricData(null)
                }}
                fullWidth
              >
                Scan Again
              </Button>
              <Button 
                variant="primary" 
                onClick={handleEnrollment}
                loading={isEnrolling}
                fullWidth
              >
                Complete Enrollment
              </Button>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-success-100 animate-bounce">
              <CheckCircle className="w-8 h-8 text-success-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-success-900">
                Enrollment Complete!
              </h3>
              <p className="mt-2 text-success-700">
                {student.firstName} {student.lastName} has been successfully enrolled
              </p>
            </div>

            <div className="p-4 rounded-lg bg-success-50">
              <p className="text-sm text-success-800">
                The student can now mark attendance using their fingerprint with the Digital Persona U.4500 scanner.
                <br />
                Biometric data has been securely encrypted and stored.
                <br />
                Template uses ANSI-378 standard minutiae format.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Digital Persona Biometric Enrollment"
      size="lg"
      closeOnOverlayClick={false}
    >
      {renderStepContent()}
    </Modal>
  )
}

export default DigitalPersonaEnrollment