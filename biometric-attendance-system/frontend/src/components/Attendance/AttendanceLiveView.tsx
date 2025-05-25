// src/components/Attendance/AttendanceLiveView.tsx
import React, { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  RefreshCw, 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp,
  Activity,
  Fingerprint,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

import type { AttendanceSession } from '../../types/attendance'
import { useSessionRecords } from '../../hooks/useAttendance'
import { useStudents } from '../../hooks/useStudents'

import Button from '../UI/Button'
import Card from '../UI/Card'
import Badge from '../UI/Badge'
import LoadingSpinner from '../UI/LoadingSpinner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AttendanceLiveViewProps {
  session: AttendanceSession
  onBack: () => void
}

const AttendanceLiveView: React.FC<AttendanceLiveViewProps> = ({
  session,
  onBack
}) => {
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Data fetching with auto-refresh
  const { 
    data: sessionRecords, 
    isLoading: recordsLoading, 
    refetch: refetchRecords 
  } = useSessionRecords(session.id)
  
  const { data: enrolledStudents } = useStudents({
    courseId: session.courseId
  })

  // Auto-refresh every 5 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (autoRefresh && session.status === 'OPEN') {
      interval = setInterval(() => {
        refetchRecords()
        setLastUpdate(new Date())
      }, 5000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, session.status, refetchRecords])

  // Generate attendance trend data (mock data for demonstration)
  const generateTrendData = () => {
    if (!sessionRecords) return []
    
    const now = new Date()
    const startTime = new Date(session.startTime)
    const data = []
    
    // Create hourly intervals
    for (let i = 0; i <= 4; i++) {
      const time = new Date(startTime.getTime() + i * 15 * 60 * 1000) // 15-minute intervals
      const recordsUpToTime = sessionRecords.filter(record => 
        new Date(record.markedAt) <= time
      ).length
      
      data.push({
        time: format(time, 'HH:mm'),
        attendance: recordsUpToTime
      })
    }
    
    return data
  }

  const trendData = generateTrendData()

  // Recent attendance activity
  const recentActivity = sessionRecords?.slice().sort((a, b) => 
    new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
  ).slice(0, 10) || []

  // Statistics
  const stats = {
    totalStudents: enrolledStudents?.length || 0,
    presentStudents: sessionRecords?.length || 0,
    attendanceRate: enrolledStudents?.length ? 
      Math.round(((sessionRecords?.length || 0) / enrolledStudents.length) * 100) : 0,
    biometricVerified: sessionRecords?.filter(r => r.biometricVerified).length || 0,
    averageConfidence: sessionRecords?.length ? 
      Math.round(sessionRecords.reduce((sum, r) => sum + (r.verificationConfidence || 0), 0) / sessionRecords.length) : 0
  }

  const handleManualRefresh = () => {
    refetchRecords()
    setLastUpdate(new Date())
  }

  if (recordsLoading && !sessionRecords) {
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
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{session.sessionName}</h1>
            <p className="text-gray-600">
              {session.course?.courseCode} • {format(new Date(session.sessionDate), 'EEEE, MMMM do, yyyy')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Activity className={`h-4 w-4 ${autoRefresh ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-600">
              Last updated {formatDistanceToNow(lastUpdate)} ago
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleManualRefresh}
              disabled={recordsLoading}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={`h-3 w-3 ${recordsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            
            <Button
              size="sm"
              variant={autoRefresh ? 'primary' : 'secondary'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto ON' : 'Auto OFF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Session Status Alert */}
      <Card className={`p-4 ${
        session.status === 'OPEN' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center space-x-3">
          {session.status === 'OPEN' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          <div>
            <p className={`font-medium ${
              session.status === 'OPEN' ? 'text-green-900' : 'text-yellow-900'
            }`}>
              Session is {session.status}
            </p>
            <p className={`text-sm ${
              session.status === 'OPEN' ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {session.status === 'OPEN' 
                ? 'Students can mark their attendance now'
                : session.status === 'CLOSED'
                ? 'No new attendance can be marked'
                : 'This session has been cancelled'
              }
            </p>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-xl font-bold">{stats.totalStudents}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-xl font-bold text-green-600">{stats.presentStudents}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Attendance Rate</p>
              <p className="text-xl font-bold text-purple-600">{stats.attendanceRate}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Fingerprint className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Biometric</p>
              <p className="text-xl font-bold text-indigo-600">{stats.biometricVerified}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Confidence</p>
              <p className="text-xl font-bold text-orange-600">{stats.averageConfidence}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Attendance Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No attendance records yet</p>
            ) : (
              recentActivity.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      {record.verificationMethod === 'BIOMETRIC' ? (
                        <Fingerprint className="h-4 w-4 text-green-600" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {record.student?.firstName} {record.student?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {record.student?.matricNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(record.markedAt))} ago
                    </p>
                    {record.verificationConfidence && (
                      <Badge variant="success" size="sm">
                        {Math.round(record.verificationConfidence)}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Session Progress</h3>
          <span className="text-sm text-gray-600">
            {stats.presentStudents} of {stats.totalStudents} students
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${stats.attendanceRate}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>0%</span>
          <span className="font-medium">{stats.attendanceRate}%</span>
          <span>100%</span>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                session.status === 'OPEN' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-medium">
                Session {session.status.toLowerCase()}
              </span>
            </div>
            
            {session.allowRemoteMarking && (
              <Badge variant="info" size="sm">
                Remote marking enabled
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            Started {format(new Date(session.startTime), 'h:mm a')}
            {session.endTime && ` • Ends ${format(new Date(session.endTime), 'h:mm a')}`}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default AttendanceLiveView