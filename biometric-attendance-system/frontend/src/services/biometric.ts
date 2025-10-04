// src/services/biometric.ts
import axios from 'axios'
import type { 
  BiometricEnrollmentData,
  Student 
} from '../types/student'
import type { 
  BiometricVerificationResult
} from '../types/biometric'

const API_URL = import.meta.env.VITE_API_URL

const biometricService = {
  enrollBiometric: async (data: BiometricEnrollmentData): Promise<Student> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.post(`${API_URL}/api/biometric/enroll`, data, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  verifyBiometric: async (studentId: string, biometricData: string): Promise<BiometricVerificationResult> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.post(`${API_URL}/api/biometric/verify`, {
      studentId,
      biometricData
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  getBiometricStatus: async (studentId: string): Promise<{ enrolled: boolean; enrolledAt?: string }> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/api/biometric/status/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  deleteBiometric: async (studentId: string): Promise<void> => {
    const token = localStorage.getItem('accessToken')
    await axios.delete(`${API_URL}/api/biometric/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  },

  updateBiometric: async (studentId: string, data: BiometricEnrollmentData): Promise<Student> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.put(`${API_URL}/api/biometric/${studentId}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  }
}

export { biometricService }