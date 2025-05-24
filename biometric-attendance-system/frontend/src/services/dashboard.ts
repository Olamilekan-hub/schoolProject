// src/services/dashboard.ts
import axios from 'axios'
import type { DashboardData } from '../types/systems'

const API_URL = import.meta.env.VITE_API_URL

const dashboardService = {
  getDashboardData: async (): Promise<DashboardData> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  getAttendanceTrend: async (days: number = 7): Promise<any[]> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/dashboard/attendance-trend?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  getCourseAttendance: async (): Promise<any[]> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/dashboard/course-attendance`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  }
}

export { dashboardService }