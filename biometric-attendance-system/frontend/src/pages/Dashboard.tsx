// src/pages/Dashboard.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Calendar,
  Plus,
  Fingerprint,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

import { useAuth } from "../context/AuthContext";
import { useDashboardData } from "../hooks/useDashboard";
import Card from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: dashboardData, isLoading, refetch } = useDashboardData();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Auto-refresh dashboard data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    totalStudents: 0,
    totalCourses: 0,
    totalSessions: 0,
    todayAttendance: 0,
    activeStudents: 0,
    enrolledBiometric: 0,
    attendanceRate: 0,
  };

  const recentAttendance = dashboardData?.recentAttendance || [];
  const upcomingSessions = dashboardData?.upcomingSessions || [];
  const attendanceTrend = dashboardData?.attendanceTrend || [];

  return (
    <div className="space-y- lg:space-y-6 lg:pl-20">
      {/* Welcome Header */}
      <div className="p-6 text-white rounded-lg bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="mt-1 text-primary-100">
              {format(currentTime, "EEEE, MMMM do, yyyy")} •{" "}
              {format(currentTime, "h:mm a")}
            </p>
            <p className="mt-2 text-sm text-primary-200">
              Here's what's happening with your attendance system today.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="flex items-center justify-center w-20 h-20 bg-white rounded-full bg-opacity-20">
              <Fingerprint className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Students
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalStudents}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Today's Attendance
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.todayAttendance}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Fingerprint className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Biometric Enrolled
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.enrolledBiometric}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Attendance Rate
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.attendanceRate}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attendance Trend Chart */}
        <Card title="Attendance Trend (Last 7 Days)" className="p-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: "#3B82F6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Course Attendance Overview */}
        <Card title="Course Attendance Overview" className="p-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData?.courseAttendance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="course" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="percentage" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Activity and Upcoming Sessions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Attendance */}
        <Card title="Recent Attendance" className="p-6">
          <div className="space-y-4">
            {recentAttendance.length === 0 ? (
              <p className="py-4 text-center text-gray-500">
                No recent attendance records
              </p>
            ) : (
              recentAttendance.slice(0, 5).map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success-100">
                      <CheckCircle className="w-4 h-4 text-success-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {record.student?.firstName} {record.student?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {record.session?.course?.courseCode} -{" "}
                        {record.session?.sessionName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="success" size="sm">
                      {record.status}
                    </Badge>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDistanceToNow(new Date(record.markedAt))} ago
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4">
            <Link to="/attendance">
              <Button variant="ghost" size="sm" fullWidth>
                View All Attendance Records
              </Button>
            </Link>
          </div>
        </Card>

        {/* Upcoming Sessions */}
        <Card title="Upcoming Sessions" className="p-6">
          <div className="space-y-4">
            {upcomingSessions.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No upcoming sessions</p>
                <Link to="/attendance">
                  <Button variant="primary" size="sm" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Session
                  </Button>
                </Link>
              </div>
            ) : (
              upcomingSessions.slice(0, 5).map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100">
                      <Clock className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {session.sessionName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {session.course?.courseCode} -{" "}
                        {session.course?.courseTitle}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(session.sessionDate), "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(session.startTime), "h:mm a")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4">
            <Link to="/attendance">
              <Button variant="ghost" size="sm" fullWidth>
                View All Sessions
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions" className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/students">
            <Button
              variant="primary"
              fullWidth
              className="flex flex-col items-center justify-center h-16 space-y-"
            >
              <Users className="w-5 h-5" />
              <span className="text-sm">Add Student</span>
            </Button>
          </Link>

          <Link to="/attendance">
            <Button
              variant="success"
              fullWidth
              className="flex flex-col items-center justify-center h-16 space-y-"
            >
              <UserCheck className="w-5 h-5" />
              <span className="text-sm">Take Attendance</span>
            </Button>
          </Link>

          <Link to="/reports">
            <Button
              variant="warning"
              fullWidth
              className="flex flex-col items-center justify-center h-16 space-y-"
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm">View Reports</span>
            </Button>
          </Link>

          <Link to="/profile">
            <Button
              variant="secondary"
              fullWidth
              className="flex flex-col items-center justify-center h-16 space-y-"
            >
              <Fingerprint className="w-5 h-5" />
              <span className="text-sm">Profile</span>
            </Button>
          </Link>
        </div>
      </Card>

      {/* System Status */}
      <Card title="System Status" className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Database Connection</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Biometric Service</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Real-time Updates</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
