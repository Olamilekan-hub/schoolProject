// src/components/Attendance/AttendanceMarking.tsx
// ✅ UPDATED IMPORTS - Replace FingerprintScanner with DigitalPersonaScanner
import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Users,
  UserCheck,
  Fingerprint,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  User,
  Shield
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

import type { AttendanceSession, MarkAttendanceData } from '../../types/attendance'
import type { Student } from '../../types/student'
import { useStudents } from '../../hooks/useStudents'
import { useMarkAttendance, useSessionRecords } from '../../hooks/useAttendance'

import Button from '../UI/Button'
import Card from '../UI/Card'
import SearchInput from '../UI/SearchInput'
import Table from '../UI/Table'
import Badge from '../UI/Badge'
import Modal from '../UI/Modal'
import LoadingSpinner from '../UI/LoadingSpinner'
import DigitalPersonaScanner from '../Biometric/DigitalPersonaScanner' // ✅ CHANGED
import type { BiometricScanResult } from '../../types/biometric'
import { biometricService } from '../../services/biometric' // ✅ ADDED for verification

interface AttendanceMarkingProps {
  session: AttendanceSession
  onBack: () => void
}

const AttendanceMarking: React.FC<AttendanceMarkingProps> = ({
  session,
  onBack
}) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showBiometricModal, setShowBiometricModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [markingMethod, setMarkingMethod] = useState<'biometric' | 'manual'>('biometric')
  const [isMarking, setIsMarking] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false) // ✅ NEW

  // Data fetching
  const { data: enrolledStudents, isLoading: studentsLoading } = useStudents({
    courseId: session.courseId
  })

  const { data: attendanceRecords, refetch: refetchRecords } = useSessionRecords(session.id)
  const { mutate: markAttendance } = useMarkAttendance()

  // Auto-refresh records every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchRecords()
    }, 10000)

    return () => clearInterval(interval)
  }, [refetchRecords])

  // Filter students based on search and attendance status
  const availableStudents = enrolledStudents?.filter(student => {
    const hasAttended = attendanceRecords?.some(record => record.studentId === student.id)
    if (hasAttended) return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase()
      const matricNumber = student.matricNumber.toLowerCase()

      return fullName.includes(query) || matricNumber.includes(query)
    }

    return true
  }) || []

  const presentStudents = attendanceRecords?.filter(record =>
    record.status === 'PRESENT'
  ) || []

  // Table columns for available students
  const studentColumns = [
    {
      key: 'student',
      header: 'Student',
      render: (student: Student) => (
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gray-300 rounded-full">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {student.firstName} {student.lastName}
            </p>
            <p className="text-sm text-gray-500">{student.matricNumber}</p>
          </div>
        </div>
      )
    },
    {
      key: 'info',
      header: 'Info',
      render: (student: Student) => (
        <div>
          <p className="text-sm text-gray-600">Level: {student.level}</p>
          {student.department && (
            <p className="text-xs text-gray-500">{student.department}</p>
          )}
        </div>
      )
    },
    {
      key: 'biometric',
      header: 'Biometric Status',
      render: (student: Student) => (
        <Badge
          variant={student.biometricEnrolled ? 'success' : 'warning'}
          size="sm"
        >
          {student.biometricEnrolled ? 'Enrolled' : 'Not Enrolled'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (student: Student) => (
        <div className="flex space-x-2">
          {student.biometricEnrolled ? (
            <Button
              size="sm"
              onClick={() => handleBiometricMarking(student)}
              className="flex items-center space-x-1"
            >
              <Fingerprint className="w-3 h-3" />
              <span>Biometric</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleManualMarking(student)}
              className="flex items-center space-x-1"
            >
              <UserCheck className="w-3 h-3" />
              <span>Manual</span>
            </Button>
          )}
        </div>
      )
    }
  ]

  // ✅ UPDATED: Event handlers with verification
  const handleBiometricMarking = (student: Student) => {
    setSelectedStudent(student)
    setMarkingMethod('biometric')
    setShowBiometricModal(true)
  }

  const handleManualMarking = (student: Student) => {
    setSelectedStudent(student)
    setMarkingMethod('manual')
    setShowManualModal(true)
  }

  // ✅ CRITICAL: Updated scan result handler with verification
  const handleBiometricScanResult = async (result: BiometricScanResult) => {
    if (!selectedStudent) return

    if (result.success && result.templateData) {
      setIsVerifying(true)

      try {
        toast('Verifying fingerprint...', { icon: '🔍' })

        // ✅ CRITICAL FIX: Parse and extract raw template
        let liveTemplateData: string

        try {
          const parsed = JSON.parse(result.templateData)

          if (!parsed.template) {
            throw new Error('No template found in scan result')
          }

          liveTemplateData = parsed.template  // ← Extract raw template

          console.log('✅ Live template extracted for verification:', {
            templateLength: liveTemplateData.length,
            format: parsed.format,
            quality: parsed.metadata?.quality
          })

        } catch (parseError) {
          console.error('❌ Failed to parse scan result:', parseError)
          toast.error('Invalid scan data format')
          return
        }

        // ✅ Send in same format as stored during enrollment
        const verificationPayload = JSON.stringify({
          template: liveTemplateData,  // ← Raw template only
          format: 'ANSI-378',
          metadata: {
            quality: result.qualityScore || 90,
            timestamp: new Date().toISOString()
          }
        })

        console.log('📤 Sending for verification:', {
          payloadLength: verificationPayload.length,
          studentId: selectedStudent.id
        })

        const verificationResult = await biometricService.verifyBiometric(
          selectedStudent.id,
          verificationPayload  // ← Same structure as enrollment
        )

        console.log('🔐 Verification result:', verificationResult)

        if (verificationResult.matched) {
          toast.success(
            `Fingerprint verified! Confidence: ${verificationResult.confidence.toFixed(1)}%`,
            { duration: 3000 }
          )

          await processAttendanceMarking(
            selectedStudent.id,
            undefined,  // ← Use formatted payload
            'BIOMETRIC',
            verificationResult.confidence
          )

          setShowBiometricModal(false)
        } else {
          toast.error(
            `Fingerprint verification failed. Confidence: ${verificationResult.confidence.toFixed(1)}%. Please try again.`,
            { duration: 5000 }
          )
        }
      } catch (error: any) {
        console.error('❌ Verification error:', error)
        toast.error(error.message || 'Verification failed. Please try again.')
      } finally {
        setIsVerifying(false)
      }
    } else {
      toast.error(result.message || 'Fingerprint scan failed')
    }
  }

  const handleManualMarkingConfirm = async () => {
    if (!selectedStudent) return

    await processAttendanceMarking(selectedStudent.id, undefined, 'MANUAL')
    setShowManualModal(false)
  }

  // ✅ UPDATED: Process attendance with confidence score
  const processAttendanceMarking = async (
    studentId: string,
    biometricData?: string,
    method: 'BIOMETRIC' | 'MANUAL' = 'MANUAL',
    confidence?: number
  ) => {
    setIsMarking(true)

    try {
      const markingData: MarkAttendanceData = {
        sessionId: session.id,
        studentId,
        biometricData,
        verificationMethod: method,
        verificationConfidence: confidence,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        }
      }

      markAttendance(markingData, {
        onSuccess: () => {
          const confidenceText = confidence
            ? ` (Confidence: ${confidence.toFixed(1)}%)`
            : ''

          toast.success(
            `✓ Attendance marked successfully!${confidenceText}`,
            { duration: 4000 }
          )
          refetchRecords()
          setSelectedStudent(null)
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to mark attendance')
        }
      })
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setIsMarking(false)
    }
  }

  const handleRefresh = () => {
    refetchRecords()
    toast.success('Records refreshed')
  }

  if (studentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sessions
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{session.sessionName}</h1>
            <p className="text-gray-600">
              {session.course?.courseCode} • {format(new Date(session.sessionDate), 'EEEE, MMMM do, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRefresh}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Session Status */}
      <Card className={`p-4 ${session.status === 'OPEN' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {session.status === 'OPEN' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <div>
              <p className={`font-medium ${session.status === 'OPEN' ? 'text-green-900' : 'text-yellow-900'
                }`}>
                Session Status: {session.status}
              </p>
              <p className={`text-sm ${session.status === 'OPEN' ? 'text-green-700' : 'text-yellow-700'
                }`}>
                {session.status === 'OPEN'
                  ? 'Ready to mark attendance'
                  : 'Session is not currently active'
                }
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              Time: {format(new Date(session.startTime), 'h:mm a')}
            </p>
            {session.endTime && (
              <p className="text-xs text-gray-500">
                Ends: {format(new Date(session.endTime), 'h:mm a')}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-xl font-bold">{enrolledStudents?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-xl font-bold text-green-600">{presentStudents.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Remaining</p>
              <p className="text-xl font-bold text-yellow-600">{availableStudents.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <SearchInput
            onSearch={setSearchQuery}
            placeholder="Search students by name or matric number..."
            className="flex-1"
          />
        </div>
      </Card>

      {/* Students Table */}
      <Card>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Students Available for Attendance</h2>
          <p className="text-sm text-gray-600">
            {availableStudents.length} students remaining
          </p>
        </div>

        {session.status === 'OPEN' ? (
          <Table
            columns={studentColumns}
            data={availableStudents}
            loading={studentsLoading}
            emptyMessage="All students have marked their attendance or no students match your search."
          />
        ) : (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p className="mb-2 text-lg font-medium text-gray-900">
              Session Not Active
            </p>
            <p className="text-gray-600">
              This session is currently {session.status.toLowerCase()}.
              Students cannot mark attendance at this time.
            </p>
          </div>
        )}
      </Card>

      {/* ✅ UPDATED: Biometric Marking Modal with DigitalPersonaScanner */}
      {selectedStudent && (
        <Modal
          isOpen={showBiometricModal}
          onClose={() => {
            if (isVerifying || isMarking) {
              toast('Please wait for the current process to complete')
              return
            }
            setShowBiometricModal(false)
            setSelectedStudent(null)
          }}
          title="Biometric Attendance Verification"
          size="lg"
          closeOnOverlayClick={false}
        >
          <div className="space-y-4">
            {/* Student Info */}
            <div className="p-4 text-center border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-center mb-2">
                <Shield className="w-6 h-6 mr-2 text-blue-600" />
                <h3 className="font-semibold text-blue-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h3>
              </div>
              <p className="text-sm font-medium text-blue-700">{selectedStudent.matricNumber}</p>
              <Badge variant="success" size="sm" className="mt-2">
                <Fingerprint className="inline w-3 h-3 mr-1" />
                Biometric Enrolled ✓
              </Badge>
            </div>

            {/* Instructions */}
            <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
              <p className="mb-2 text-sm font-medium text-yellow-900">
                📋 Verification Process:
              </p>
              <ol className="space-y-1 text-sm text-yellow-800 list-decimal list-inside">
                <li>Place the <strong>same finger</strong> used during enrollment on the scanner</li>
                <li>System will compare the live scan with stored template</li>
                <li>Match confidence must be ≥ 75% to approve attendance</li>
                <li>Attendance will be marked automatically upon successful verification</li>
              </ol>
            </div>

            {/* ✅ Digital Persona Scanner Component */}
            <DigitalPersonaScanner
              onScanResult={handleBiometricScanResult}
              disabled={isVerifying || isMarking}
              mode="capture"
              className="max-w-md mx-auto"
            />

            {/* Status Messages */}
            {isVerifying && (
              <div className="p-4 text-center rounded-lg bg-blue-50">
                <LoadingSpinner size="sm" className="mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-900">
                  🔍 Verifying fingerprint against stored template...
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  Please wait, this may take a few seconds
                </p>
              </div>
            )}

            {isMarking && (
              <div className="p-4 text-center rounded-lg bg-green-50">
                <LoadingSpinner size="sm" className="mx-auto mb-2" />
                <p className="text-sm font-medium text-green-900">
                  ✓ Verification successful! Marking attendance...
                </p>
              </div>
            )}

            {/* Security Notice */}
            <div className="p-3 text-xs text-gray-600 rounded-lg bg-gray-50">
              <p className="flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                <strong>Security:</strong> All biometric data is encrypted using AES-256-GCM encryption
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Marking Modal */}
      {selectedStudent && (
        <Modal
          isOpen={showManualModal}
          onClose={() => {
            setShowManualModal(false)
            setSelectedStudent(null)
          }}
          title="Manual Attendance Marking"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 text-center rounded-lg bg-gray-50">
              <h3 className="font-medium text-gray-900">
                {selectedStudent.firstName} {selectedStudent.lastName}
              </h3>
              <p className="text-sm text-gray-600">{selectedStudent.matricNumber}</p>
              <Badge variant="warning" size="sm" className="mt-2">
                Biometric Not Enrolled
              </Badge>
            </div>

            <div className="p-4 rounded-lg bg-yellow-50">
              <p className="text-sm text-yellow-800">
                This student hasn't enrolled their biometric data yet.
                You can mark their attendance manually.
              </p>
            </div>

            <div className="flex space-x-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowManualModal(false)
                  setSelectedStudent(null)
                }}
                fullWidth
              >
                Cancel
              </Button>
              <Button
                onClick={handleManualMarkingConfirm}
                loading={isMarking}
                fullWidth
              >
                Mark Present
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AttendanceMarking