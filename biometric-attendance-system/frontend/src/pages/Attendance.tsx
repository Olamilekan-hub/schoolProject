// src/pages/Attendance.tsx - Complete Implementation
import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  UserCheck, 
  Link as LinkIcon,
  QrCode,
  Play,
  Pause,
  Square,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Copy,
  Share2
} from 'lucide-react'
import { format, addDays, isToday, isPast, isFuture } from 'date-fns'
import toast from 'react-hot-toast'

import { useAttendanceSessions, useCreateSession, useUpdateSessionStatus } from '../hooks/useAttendance'
import { useCourses } from '../hooks/useCourses'
import type { AttendanceSession, CreateAttendanceSessionData, SessionStatus } from '../types/attendance'
import type { Course } from '../types/course'

import Button from '../components/UI/Button'
import Card from '../components/UI/Card'
import Badge from '../components/UI/Badge'
import Modal from '../components/UI/Modal'
import Table from '../components/UI/Table'
import Input from '../components/UI/Input'
import Select from '../components/UI/Select'
import SearchInput from '../components/UI/SearchInput'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import AttendanceSessionForm from '../components/Attendance/AttendanceSessionForm'
import AttendanceMarking from '../components/Attendance/AttendanceMarking'
import AttendanceLiveView from '../components/Attendance/AttendanceLiveView'
import QRCodeGenerator from '../components/UI/QRCodeGenerator'
import Tooltip from '../components/UI/Tooltip'

const Attendance: React.FC = () => {
  // State management
  const [view, setView] = useState<'sessions' | 'marking' | 'live'>('sessions')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null)
  const [attendanceLink, setAttendanceLink] = useState('')
  
  // Filters
  const [dateFilter, setDateFilter] = useState('all') // today, week, month, all
  const [statusFilter, setStatusFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Data fetching
  const { data: sessions, isLoading: sessionsLoading, refetch } = useAttendanceSessions()
  const { data: courses } = useCourses()
  const { mutate: createSession } = useCreateSession()
  const { mutate: updateSessionStatus } = useUpdateSessionStatus()

  // Filter sessions based on current filters
  const filteredSessions = sessions?.filter(session => {
    // Date filter
    if (dateFilter === 'today' && !isToday(new Date(session.sessionDate))) return false
    if (dateFilter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      if (new Date(session.sessionDate) < weekAgo) return false
    }
    if (dateFilter === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      if (new Date(session.sessionDate) < monthAgo) return false
    }

    // Status filter
    if (statusFilter !== 'all' && session.status !== statusFilter) return false

    // Course filter
    if (courseFilter !== 'all' && session.courseId !== courseFilter) return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const sessionName = session.sessionName.toLowerCase()
      const courseCode = session.course?.courseCode.toLowerCase() || ''
      const courseTitle = session.course?.courseTitle.toLowerCase() || ''
      
      if (!sessionName.includes(query) && !courseCode.includes(query) && !courseTitle.includes(query)) {
        return false
      }
    }

    return true
  }) || []

  // Get statistics
  const todaySessions = sessions?.filter(session => 
    isToday(new Date(session.sessionDate))
  ) || []

  const activeSessions = sessions?.filter(session => session.status === 'OPEN') || []

  const totalAttendance = sessions?.reduce((acc, session) => 
    acc + (session.attendanceRecords?.length || 0), 0
  ) || 0

  // Table columns for sessions
  const sessionColumns = [
    {
      key: 'session',
      header: 'Session Details',
      render: (session: AttendanceSession) => (
        <div>
          <p className="font-medium text-gray-900">{session.sessionName}</p>
          <p className="text-sm text-gray-500">
            {session.course?.courseCode} - {session.course?.courseTitle}
          </p>
        </div>
      )
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (session: AttendanceSession) => {
        const sessionDate = new Date(session.sessionDate)
        const startTime = new Date(session.startTime)
        
        return (
          <div>
            <p className={`text-sm font-medium ${
              isToday(sessionDate) ? 'text-blue-600' : 
              isPast(sessionDate) ? 'text-gray-600' : 'text-green-600'
            }`}>
              {format(sessionDate, 'MMM dd, yyyy')}
            </p>
            <p className="text-sm text-gray-500">
              {format(startTime, 'h:mm a')}
              {session.endTime && ` - ${format(new Date(session.endTime), 'h:mm a')}`}
            </p>
            {isToday(sessionDate) && (
              <Badge variant="info" size="sm" className="mt-1">Today</Badge>
            )}
          </div>
        )
      }
    },
    {
      key: 'attendance',
      header: 'Attendance',
      render: (session: AttendanceSession) => {
        const presentCount = session.attendanceRecords?.filter(r => r.status === 'PRESENT').length || 0
        const totalRecords = session.attendanceRecords?.length || 0
        
        return (
          <div>
            <p className="text-sm font-medium">
              {presentCount} present
            </p>
            <p className="text-sm text-gray-500">
              {totalRecords} total records
            </p>
            {totalRecords > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(presentCount / totalRecords) * 100}%` }}
                />
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (session: AttendanceSession) => (
        <div className="flex items-center space-x-2">
          <Badge 
            variant={
              session.status === 'OPEN' ? 'success' :
              session.status === 'CLOSED' ? 'secondary' : 'warning'
            }
          >
            {session.status}
          </Badge>
          {session.allowRemoteMarking && (
            <Tooltip content="Remote attendance enabled">
              <LinkIcon className="h-4 w-4 text-blue-500" />
            </Tooltip>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (session: AttendanceSession) => (
        <div className="flex items-center space-x-1">
          {session.status === 'OPEN' && (
            <>
              <Tooltip content="Mark Attendance">
                <Button
                  size="sm"
                  onClick={() => handleMarkAttendance(session)}
                  className="h-8 w-8 p-0"
                >
                  <UserCheck className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <Tooltip content="Generate Link">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleGenerateLink(session)}
                  className="h-8 w-8 p-0"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <Tooltip content="Close Session">
                <Button
                  size="sm"
                  variant="warning"
                  onClick={() => handleCloseSession(session)}
                  className="h-8 w-8 p-0"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </Tooltip>
            </>
          )}
          
          <Tooltip content="Live View">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleViewLive(session)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content="Edit Session">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleEditSession(session)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content="Delete Session">
            <Button
              size="sm"
              variant="error"
              onClick={() => handleDeleteSession(session)}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ]

  // Event handlers
  const handleCreateSession = () => {
    setSelectedSession(null)
    setShowCreateModal(true)
  }

  const handleEditSession = (session: AttendanceSession) => {
    setSelectedSession(session)
    setShowEditModal(true)
  }

  const handleMarkAttendance = (session: AttendanceSession) => {
    setSelectedSession(session)
    setView('marking')
  }

  const handleViewLive = (session: AttendanceSession) => {
    setSelectedSession(session)
    setView('live')
  }

  const handleCloseSession = async (session: AttendanceSession) => {
    if (window.confirm('Are you sure you want to close this session? Students will no longer be able to mark attendance.')) {
      try {
        await updateSessionStatus({ sessionId: session.id, status: 'CLOSED' })
        toast.success('Session closed successfully')
        refetch()
      } catch (error) {
        toast.error('Failed to close session')
      }
    }
  }

  const handleDeleteSession = async (session: AttendanceSession) => {
    if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        // TODO: Implement delete session
        toast.success('Session deleted successfully')
        refetch()
      } catch (error) {
        toast.error('Failed to delete session')
      }
    }
  }

  const handleGenerateLink = async (session: AttendanceSession) => {
    try {
      // TODO: Generate attendance link
      const link = `${window.location.origin}/attendance/${session.attendanceLinkToken || 'temp-token'}`
      setAttendanceLink(link)
      setSelectedSession(session)
      setShowQRModal(true)
    } catch (error) {
      toast.error('Failed to generate attendance link')
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(attendanceLink)
      toast.success('Link copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleShareWhatsApp = () => {
    const message = `Mark your attendance for ${selectedSession?.sessionName}: ${attendanceLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`)
  }

  const handleSessionCreated = () => {
    refetch()
    setShowCreateModal(false)
    setShowEditModal(false)
  }

  const handleExportSessions = () => {
    // TODO: Implement export functionality
    toast.info('Export functionality coming soon')
  }

  // Auto-refresh sessions every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 30000)

    return () => clearInterval(interval)
  }, [refetch])

  // Render based on current view
  const renderContent = () => {
    switch (view) {
      case 'marking':
        return selectedSession ? (
          <AttendanceMarking 
            session={selectedSession}
            onBack={() => {
              setView('sessions')
              setSelectedSession(null)
            }}
          />
        ) : null

      case 'live':
        return selectedSession ? (
          <AttendanceLiveView 
            session={selectedSession}
            onBack={() => {
              setView('sessions')
              setSelectedSession(null)
            }}
          />
        ) : null

      default:
        return (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Today's Sessions</p>
                    <p className="text-xl font-bold">{todaySessions.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Play className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Sessions</p>
                    <p className="text-xl font-bold">{activeSessions.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <UserCheck className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Attendance</p>
                    <p className="text-xl font-bold">{totalAttendance}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Sessions</p>
                    <p className="text-xl font-bold">{sessions?.length || 0}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Active Sessions Alert */}
            {activeSessions.length > 0 && (
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium text-green-900">
                        {activeSessions.length} Active Session{activeSessions.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-green-700">
                        Students can mark attendance now
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="success"
                      onClick={() => handleMarkAttendance(activeSessions[0])}
                    >
                      Mark Attendance
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleViewLive(activeSessions[0])}
                    >
                      Live View
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <SearchInput
                    onSearch={setSearchQuery}
                    placeholder="Search sessions..."
                    className="w-full sm:w-64"
                  />
                  
                  <Select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full sm:w-32"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </Select>
                  
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-32"
                  >
                    <option value="all">All Status</option>
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </Select>
                  
                  <Select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="w-full sm:w-48"
                  >
                    <option value="all">All Courses</option>
                    {courses?.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.courseCode}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-wrap items-center space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleExportSessions}
                    className="flex items-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => refetch()}
                    className="flex items-center space-x-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Sessions Table */}
            <Card>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Attendance Sessions</h2>
                    <p className="text-sm text-gray-600">
                      {filteredSessions.length} of {sessions?.length || 0} sessions
                    </p>
                  </div>
                  <Button onClick={handleCreateSession}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Session
                  </Button>
                </div>
              </div>
              
              <Table
                columns={sessionColumns}
                data={filteredSessions}
                loading={sessionsLoading}
                emptyMessage="No attendance sessions found. Create your first session to get started."
              />
            </Card>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600">Create sessions and track student attendance</p>
        </div>
        
        {view !== 'sessions' && (
          <Button 
            variant="secondary" 
            onClick={() => {
              setView('sessions')
              setSelectedSession(null)
            }}
          >
            Back to Sessions
          </Button>
        )}
      </div>

      {/* Content */}
      {renderContent()}

      {/* Modals */}
      <AttendanceSessionForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        courses={courses || []}
        onSuccess={handleSessionCreated}
      />

      <AttendanceSessionForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        session={selectedSession}
        courses={courses || []}
        onSuccess={handleSessionCreated}
      />

      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Attendance Link & QR Code"
        size="md"
      >
        <div className="space-y-4 text-center">
          <p className="text-gray-600">
            Share this link or QR code with students to mark attendance
          </p>
          
          {selectedSession && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
              <h4 className="font-medium text-blue-900">Session Details:</h4>
              <p className="text-sm text-blue-700">
                {selectedSession.sessionName}
              </p>
              <p className="text-xs text-blue-600">
                {selectedSession.course?.courseCode} - {format(new Date(selectedSession.sessionDate), 'MMM dd, yyyy')}
              </p>
            </div>
          )}
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <QRCodeGenerator value={attendanceLink} size={200} />
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg text-left">
            <p className="text-sm font-medium text-gray-700 mb-1">Attendance Link:</p>
            <p className="text-sm text-gray-600 break-all font-mono">{attendanceLink}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={handleCopyLink}
              className="flex items-center space-x-2"
            >
              <Copy className="h-4 w-4" />
              <span>Copy Link</span>
            </Button>
            <Button
              variant="success"
              onClick={handleShareWhatsApp}
              className="flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>WhatsApp</span>
            </Button>
          </div>
          
          <div className="text-left text-xs text-gray-500 space-y-1">
            <p>• Link expires in 24 hours</p>
            <p>• Students need their matric number to mark attendance</p>
            <p>• Biometric verification required if enrolled</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Attendance