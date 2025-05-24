// src/services/courses.ts
import axios from 'axios'
import type { Course, CreateCourseData, UpdateCourseData } from '../types/course'

const API_URL = import.meta.env.VITE_API_URL

const courseService = {
  getCourses: async (): Promise<Course[]> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/courses`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  getCourse: async (id: string): Promise<Course> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/courses/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  createCourse: async (data: CreateCourseData): Promise<Course> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.post(`${API_URL}/courses`, data, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  updateCourse: async (data: UpdateCourseData): Promise<Course> => {
    const token = localStorage.getItem('accessToken')
    const { id, ...updateData } = data
    const response = await axios.put(`${API_URL}/courses/${id}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  deleteCourse: async (id: string): Promise<void> => {
    const token = localStorage.getItem('accessToken')
    await axios.delete(`${API_URL}/courses/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  }
}

export { courseService }