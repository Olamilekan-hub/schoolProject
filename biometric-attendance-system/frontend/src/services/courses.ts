// src/services/courses.ts - Course Service API
import axios from 'axios'
import type { Option } from '../components/UI/MultiSelect'

const API_URL = import.meta.env.VITE_API_URL

const coursesService = {
  getAllCourses: async (): Promise<Option[]> => {
    try {
      const response = await axios.get(`${API_URL}/courses/all`)
      return response.data.data || []
    } catch (error) {
      console.error('Failed to fetch courses:', error)
      return []
    }
  },

  createCourse: async (courseData: {
    courseCode: string
    courseTitle: string
    description?: string
    creditUnits: number
    semester: 'FIRST' | 'SECOND'
  }): Promise<Option | null> => {
    try {
      const response = await axios.post(`${API_URL}/courses/create`, courseData)
      return response.data.data || null
    } catch (error) {
      console.error('Failed to create course:', error)
      throw error
    }
  },
}

export { coursesService }