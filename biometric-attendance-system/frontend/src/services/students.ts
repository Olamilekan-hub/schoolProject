// src/services/students.ts
import axios from 'axios'
import type { Student, CreateStudentData, UpdateStudentData } from '../types/student'
// import type { ApiResponse } from '../types'

const API_URL = import.meta.env.VITE_API_URL

const studentService = {
  getStudents: async (options: any = {}): Promise<Student[]> => {
    const token = localStorage.getItem('accessToken')
    const params = new URLSearchParams()
    
    Object.keys(options).forEach(key => {
      if (options[key]) {
        params.append(key, options[key])
      }
    })
    
    const response = await axios.get(`${API_URL}/students?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  getStudent: async (id: string): Promise<Student> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/students/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  createStudent: async (data: CreateStudentData): Promise<Student> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.post(`${API_URL}/students`, data, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  updateStudent: async (data: UpdateStudentData): Promise<Student> => {
    const token = localStorage.getItem('accessToken')
    const { id, ...updateData } = data
    const response = await axios.put(`${API_URL}/students/${id}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  deleteStudent: async (id: string): Promise<void> => {
    const token = localStorage.getItem('accessToken')
    await axios.delete(`${API_URL}/students/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  },

  bulkImport: async (file: File): Promise<{ success: number; errors: any[] }> => {
    const token = localStorage.getItem('accessToken')
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await axios.post(`${API_URL}/students/bulk-import`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.data
  },

  exportStudents: async (format: 'csv' | 'excel' = 'excel'): Promise<Blob> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/students/export?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    })
    return response.data
  }
}

export { studentService }