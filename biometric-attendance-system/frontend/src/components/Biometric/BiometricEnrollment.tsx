// src/components/Biometric/BiometricEnrollment.tsx
import React, { useState } from 'react'
import { User, Fingerprint, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

import type { Student, BiometricEnrollmentData } from '../../types/student'
import type { BiometricScanResult } from '../../types/components'
import FingerprintScanner from './FingerprintScanner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import { biometricService } from '../../services/biometric'

interface BiometricEnrollmentProps {
  student: Student
  isOpen: boolean
  onClose: () => void
  onEnrollmentComplete: (student: Student) => void
}

const BiometricEnrollment: React.FC<BiometricEnrollmentProps> = ({
  student,
  isOpen,
  onClose,
  onEnrollmentComplete,
}) => {
  const [enrollmentStep, setEnrollmentStep] = useState<'info' | 'scan' | 'confirm' | 'complete'>('info')
  const [biometricData, setBiometricData] = useState<BiometricScanResult | null>(null)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [scansCompleted, setScansCompleted] = useState(0)
  const requiredScans = 3

  const handleScanResult = (result: BiometricScanResult) => {
    if (result.success) {
      setBiometricData(result)
      setScansCompleted(prev => prev + 1)
      
      if (scansCompleted + 1 >= requiredScans) {
        setEnrollmentStep('confirm')
        toast.success(`All ${requiredScans} scans completed successfully!`)
      } else {
        toast.success(`Scan ${scansCompleted + 1} of ${requiredScans} completed`)
      }
    } else {
      toast.error(result.message)
    }
  }

  const handleEnrollment = async () => {
    if (!biometricData) return

    setIsEnrolling(true)
    try {
      const enrollmentData: BiometricEnrollmentData = {
        studentId: student.id,
        biometricData: biometricData.templateData!,
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
    } finally {
      setIsEnrolling(false)
    }
  }

  const resetEnrollment = () => {
    setEnrollmentStep('info')
    setBiometricData(null)
    setScansCompleted(0)
    setIsEnrolling(false)
  }

  const handleClose = () => {
    resetEnrollment()
    onClose()
  }

  const renderStepContent = () => {
    switch (enrollmentStep) {
      case 'info':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Biometric Enrollment
              </h3>
              <p className="text-gray-600 mt-2">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-sm text-gray-500">
                Matric No: {student.matricNumber}
              </p>
            </div>

            <div className="text-left bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Enrollment Process:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>You'll need to scan your fingerprint {requiredScans} times</li>
                <li>Each scan will be processed and verified</li>
                <li>Your biometric template will be securely stored</li>
                <li>You can then use this for attendance marking</li>
              </ol>
            </div>

            <div className="text-left bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Important Notes:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                <li>Only fingerprint templates are stored, not actual images</li>
                <li>Data is encrypted and securely protected</li>
                <li>You can request deletion of your biometric data anytime</li>
                <li>This data is used solely for attendance verification</li>
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
              <p className="text-gray-600 mt-1">
                Scan {scansCompleted} of {requiredScans} completed
              </p>
              <div className="flex justify-center mt-2 space-x-1">
                {Array.from({ length: requiredScans }).map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index < scansCompleted ? 'bg-success-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <FingerprintScanner
              onScanResult={handleScanResult}
              className="max-w-md mx-auto"
            />

            <div className="flex space-x-4">
              <Button variant="secondary" onClick={handleClose} fullWidth>
                Cancel
              </Button>
              {scansCompleted > 0 && (
                <Button 
                  variant="warning" 
                  onClick={() => {
                    setScansCompleted(0)
                    setBiometricData(null)
                  }}
                  fullWidth
                >
                  Reset Scans
                </Button>
              )}
            </div>
          </div>
        )

      case 'confirm':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto h-16 w-16 bg-success-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Enrollment
              </h3>
              <p className="text-gray-600 mt-2">
                All fingerprint scans completed successfully
              </p>
            </div>

            {biometricData && (
              <div className="bg-gray-50 p-4 rounded-lg text-left">
                <h4 className="font-medium text-gray-900 mb-2">Scan Results:</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Quality Score: {biometricData.qualityScore?.toFixed(1)}%</p>
                  <p>Confidence: {biometricData.confidence?.toFixed(1)}%</p>
                  <p>Scans Completed: {scansCompleted}/{requiredScans}</p>
                  <p>Device: {biometricData.deviceInfo?.platform}</p>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <Button 
                variant="secondary" 
                onClick={() => setEnrollmentStep('scan')}
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
          <div className="text-center space-y-6">
            <div className="mx-auto h-16 w-16 bg-success-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-success-900">
                Enrollment Complete!
              </h3>
              <p className="text-success-700 mt-2">
                {student.firstName} {student.lastName} has been successfully enrolled
              </p>
            </div>

            <div className="bg-success-50 p-4 rounded-lg">
              <p className="text-sm text-success-800">
                The student can now mark attendance using their fingerprint.
                The biometric data has been securely stored and encrypted.
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
      title="Biometric Enrollment"
      size="lg"
      closeOnOverlayClick={false}
    >
      {renderStepContent()}
    </Modal>
  )
}

export default BiometricEnrollment