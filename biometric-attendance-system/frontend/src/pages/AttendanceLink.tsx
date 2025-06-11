// src/pages/AttendanceLink.tsx
import React, { useState, useEffect } from 'react'
import { 
    useParams,
    //  useNavigate
} from 'react-router-dom'
import { 
  Fingerprint, 
  User, 
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react'

import { attendanceService } from '../services/attendance'
import type { AttendanceSession } from '../types/attendance'

import Button from '../components/UI/Button'
import Card from '../components/UI/Card'
import Input from '../components/UI/Input'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import FingerprintScanner from '../components/Biometric/FingerprintScanner'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const AttendanceLink: React.FC = () => {
  const { token } = useParams<{ token: string }>()
//   const navigate = useNavigate()
  
  const [session, setSession] = useState<AttendanceSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'info' | 'identify' | 'biometric' | 'success' | 'error'>('info')
  const [matricNumber, setMatricNumber] = useState('')
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    if (token) {
      loadSessionInfo()
    }
  }, [token])

  const loadSessionInfo = async () => {
    try {
      setLoading(true)
      // TODO: Implement session loading by token
      // const sessionData = await attendanceService.getSessionByToken(token!)
      
      // Mock session data for now
      const mockSession: AttendanceSession = {
        id: '1',
        courseId: '1',
        teacherId: '1',
        sessionName: 'Lecture 1: Introduction to Programming',
        sessionDate: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: undefined,
        attendanceLinkToken: token!,
        linkExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        allowRemoteMarking: true,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        course: {
          id: '1',
          courseCode: 'CSC101',
          courseTitle: 'Introduction to Computer Science',
          description: 'Basic concepts of computer science',
          creditUnits: 3,
          semester: 'FIRST',
          academicYear: '2024/2025',
          teacherId: '1',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
      
      setSession(mockSession)
      setStep('identify')
    } catch (err: any) {
      setError(err.message || 'Failed to load session information')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const handleMatricSubmit = async () => {
    if (!matricNumber.trim()) {
      toast.error('Please enter your matric number')
      return
    }

    try {
      // TODO: Verify student exists and is enrolled
      // const student = await studentService.getByMatricNumber(matricNumber)
      
      // Mock student verification
      const mockStudent = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        matricNumber: matricNumber,
        biometricEnrolled: true
      }
      
      setStudentInfo(mockStudent)
      
      if (mockStudent.biometricEnrolled) {
        setStep('biometric')
      } else {
        // Mark attendance without biometric
        await markAttendance()
      }
    } catch (error: any) {
      toast.error(error.message || 'Student not found or not enrolled in this course')
    }
  }

  const handleBiometricScan = async (result: any) => {
    if (result.success) {
      await markAttendance(result.templateData)
    } else {
      toast.error(result.message)
    }
  }

  const markAttendance = async (biometricData?: string) => {
    if (!session || !studentInfo) return

    try {
      setMarking(true)
      
      const result = await attendanceService.markAttendanceByLink(token!, {
        studentId: studentInfo.id,
        biometricData,
        verificationMethod: biometricData ? 'BIOMETRIC' : 'LINK'
      })

      if (result.success) {
        setStep('success')
        toast.success(result.message)
      } else {
        setStep('error')
        setError(result.message)
      }
    } catch (error: any) {
      setStep('error')
      setError(error.message || 'Failed to mark attendance')
      toast.error(error.message || 'Failed to mark attendance')
    } finally {
      setMarking(false)
    }
  }

  const renderContent = () => {
    switch (step) {
      case 'info':
        return (
          <Card className="p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
                <Fingerprint className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Loading Attendance Session...
            </h1>
            
            <LoadingSpinner size="lg" className="mx-auto" />
          </Card>
        )

      case 'identify':
        return (
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Mark Your Attendance
              </h1>
              <p className="text-gray-600">
                Enter your matric number to continue
              </p>
            </div>

            {session && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">{session.sessionName}</p>
                    <p className="text-sm text-blue-700">
                      {session.course?.courseCode} - {session.course?.courseTitle}
                    </p>
                    <p className="text-sm text-blue-600">
                      {format(new Date(session.sessionDate), 'EEEE, MMMM do, yyyy')} at{' '}
                      {format(new Date(session.startTime), 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Matric Number"
                placeholder="e.g., CSC/2021/001"
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleMatricSubmit()}
              />
              
              <Button onClick={handleMatricSubmit} fullWidth>
                Continue
              </Button>
            </div>
          </Card>
        )

      case 'biometric':
        return (
          <Card className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Biometric Verification
              </h2>
              <p className="text-gray-600">
                Place your finger on the scanner to mark attendance
              </p>
              
              {studentInfo && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{studentInfo.firstName} {studentInfo.lastName}</p>
                  <p className="text-sm text-gray-600">{studentInfo.matricNumber}</p>
                </div>
              )}
            </div>

            <FingerprintScanner
              onScanResult={handleBiometricScan}
              disabled={marking}
            />

            <div className="text-center mt-6">
              <Button
                variant="secondary"
                onClick={() => markAttendance()}
                disabled={marking}
              >
                Mark Without Biometric
              </Button>
            </div>
          </Card>
        )

      case 'success':
        return (
          <Card className="p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-green-900 mb-2">
              Attendance Marked Successfully!
            </h1>
            
            {studentInfo && (
              <p className="text-green-700 mb-4">
                {studentInfo.firstName} {studentInfo.lastName}, your attendance has been recorded.
              </p>
            )}
            
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-green-800">
                Time: {format(new Date(), 'h:mm:ss a')}
              </p>
              <p className="text-sm text-green-800">
                Date: {format(new Date(), 'EEEE, MMMM do, yyyy')}
              </p>
            </div>

            <Button onClick={() => window.close()} fullWidth>
              Close
            </Button>
          </Card>
        )

      case 'error':
        return (
          <Card className="p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-red-900 mb-2">
              Unable to Mark Attendance
            </h1>
            
            <p className="text-red-700 mb-6">
              {error || 'An error occurred while processing your request'}
            </p>

            <div className="space-y-3">
              <Button onClick={() => window.location.reload()} fullWidth>
                Try Again
              </Button>
              <Button variant="secondary" onClick={() => window.close()} fullWidth>
                Close
              </Button>
            </div>
          </Card>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {renderContent()}
        
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Biometric Attendance Management System
          </p>
        </div>
      </div>
    </div>
  )
}

export default AttendanceLink