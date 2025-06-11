// src/pages/Reports.tsx
import React, { useState } from 'react'
import { 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp, 
  Users, 
  FileText,
  BarChart3,
  PieChart
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

import { useAttendanceReports } from '../hooks/useReports'
import { useCourses } from '../hooks/useCourses'
import type { ExportOptions } from '../types/reports'

import Button from '../components/UI/Button'
import Card from '../components/UI/Card'
import Select from '../components/UI/Select'
import Input from '../components/UI/Input'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts'

const Reports: React.FC = () => {
  // State for filters
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })
  const [selectedCourse, setSelectedCourse] = useState('')
  const [reportType, setReportType] = useState<'overview' | 'detailed' | 'analytics'>('overview')

  // Data fetching
  const { data: courses } = useCourses()
  const { 
    data: reportData, 
    isLoading,
    refetch 
  } = useAttendanceReports({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    courseId: selectedCourse
  })

  const handleExport = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
    const exportOptions: ExportOptions = {
      format,
      dateRange,
      includeDetails: reportType === 'detailed',
      courseIds: selectedCourse ? [selectedCourse] : undefined
    }

    try {
      // TODO: Implement export functionality
      console.log('Exporting report:', exportOptions)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleDateRangeChange = (type: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }))
  }

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-2 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and analyze attendance reports</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={() => handleExport('PDF')}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="secondary" onClick={() => handleExport('EXCEL')}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Start Date
            </label>
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              End Date
            </label>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
            />
          </div>
          
          <Select
            label="Course"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="">All Courses</option>
            {courses?.map(course => (
              <option key={course.id} value={course.id}>
                {course.courseCode} - {course.courseTitle}
              </option>
            ))}
          </Select>
          
          <Select
            label="Report Type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
          >
            <option value="overview">Overview</option>
            <option value="detailed">Detailed</option>
            <option value="analytics">Analytics</option>
          </Select>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-xl font-bold">{reportData?.totalStudents || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-xl font-bold">{reportData?.totalSessions || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Attendance</p>
              <p className="text-xl font-bold">{reportData?.averageAttendance || 0}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-xl font-bold">{reportData?.totalRecords || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attendance Trend */}
        <Card title="Attendance Trend" className="p-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportData?.attendanceTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Course Comparison */}
        <Card title="Course Attendance Comparison" className="p-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData?.courseComparison || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="courseCode" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="percentage" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Detailed Tables */}
      {reportType === 'detailed' && (
        <div className="space-y-6">
          {/* Student Attendance Table */}
          <Card title="Student Attendance Details" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table min-w-full">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Matric No.</th>
                    <th>Sessions Attended</th>
                    <th>Total Sessions</th>
                    <th>Attendance %</th>
                    <th>Last Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.studentDetails?.map((student: any) => (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>{student.matricNumber}</td>
                      <td>{student.sessionsAttended}</td>
                      <td>{student.totalSessions}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-sm ${
                          student.attendancePercentage >= 75 
                            ? 'bg-green-100 text-green-800'
                            : student.attendancePercentage >= 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.attendancePercentage}%
                        </span>
                      </td>
                      <td>{student.lastAttendance ? format(new Date(student.lastAttendance), 'MMM dd, yyyy') : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Session Details Table */}
          <Card title="Session Details" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table min-w-full">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Course</th>
                    <th>Date</th>
                    <th>Present</th>
                    <th>Total</th>
                    <th>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.sessionDetails?.map((session: any) => (
                    <tr key={session.id}>
                      <td>{session.sessionName}</td>
                      <td>{session.courseCode}</td>
                      <td>{format(new Date(session.date), 'MMM dd, yyyy')}</td>
                      <td>{session.presentCount}</td>
                      <td>{session.totalStudents}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-sm ${
                          session.attendancePercentage >= 75 
                            ? 'bg-green-100 text-green-800'
                            : session.attendancePercentage >= 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {session.attendancePercentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Reports