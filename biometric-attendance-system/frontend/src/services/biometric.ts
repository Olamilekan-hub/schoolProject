// src/services/biometric.ts - Digital Persona U.4500 Integration
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
  /**
   * Enroll a student's fingerprint using Digital Persona U.4500
   * @param data - Biometric enrollment data including template from Digital Persona
   */
  enrollBiometric: async (data: BiometricEnrollmentData): Promise<Student> => {
    try {
      const token = localStorage.getItem('accessToken')
      
      if (!token) {
        throw new Error('Authentication required')
      }

      // Parse the template data to validate it's in correct format
      let templateData
      try {
        templateData = JSON.parse(data.biometricData)
        
        // Validate Digital Persona template structure
        if (!templateData.template) {
          throw new Error('Invalid Digital Persona template format')
        }
        
        // Ensure it's ANSI-378 format (Digital Persona standard)
        if (templateData.format !== 'ANSI-378') {
          console.warn('Template format is not ANSI-378, but proceeding with enrollment')
        }
      } catch (parseError) {
        throw new Error('Invalid biometric template data format')
      }

      const response = await axios.post(
        `${API_URL}/api/biometric/enroll`, 
        {
          studentId: data.studentId,
          biometricData: data.biometricData, // Send as-is to backend for encryption
          deviceInfo: data.deviceInfo,
          qualityScore: data.qualityScore || 80,
          templateType: 'FINGERPRINT',
          scannerModel: 'Digital Persona U.4500',
          templateFormat: 'ANSI-378'
        }, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.data.success) {
        throw new Error(response.data.message || 'Enrollment failed')
      }

      return response.data.data
    } catch (error: any) {
      console.error('Biometric enrollment error:', error)
      
      if (error.response) {
        // Server responded with error
        throw new Error(error.response.data.message || 'Enrollment failed on server')
      } else if (error.request) {
        // Request made but no response
        throw new Error('No response from server. Please check your connection.')
      } else {
        // Other errors
        throw new Error(error.message || 'Enrollment failed')
      }
    }
  },

  /**
   * Verify a student's fingerprint against stored template
   * @param studentId - Student ID to verify
   * @param biometricData - Live fingerprint template from Digital Persona
   */
  verifyBiometric: async (
    studentId: string, 
    biometricData: string
  ): Promise<BiometricVerificationResult> => {
    try {
      const token = localStorage.getItem('accessToken')
      
      if (!token) {
        throw new Error('Authentication required')
      }

      // Validate template data before sending
      let templateData
      try {
        templateData = JSON.parse(biometricData)
        
        if (!templateData.template) {
          throw new Error('Invalid Digital Persona template for verification')
        }
      } catch (parseError) {
        throw new Error('Invalid biometric template data format')
      }

      const response = await axios.post(
        `${API_URL}/api/biometric/verify`, 
        {
          studentId,
          biometricData,
          scannerModel: 'Digital Persona U.4500',
          templateFormat: 'ANSI-378'
        }, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.data.success) {
        throw new Error(response.data.message || 'Verification failed')
      }

      return response.data.data
    } catch (error: any) {
      console.error('Biometric verification error:', error)
      
      if (error.response) {
        throw new Error(error.response.data.message || 'Verification failed on server')
      } else if (error.request) {
        throw new Error('No response from server. Please check your connection.')
      } else {
        throw new Error(error.message || 'Verification failed')
      }
    }
  },

  /**
   * Get biometric enrollment status for a student
   * @param studentId - Student ID to check
   */
  getBiometricStatus: async (
    studentId: string
  ): Promise<{ 
    enrolled: boolean
    enrolledAt?: string
    qualityScore?: number
    templates?: number
    scannerModel?: string
  }> => {
    try {
      const token = localStorage.getItem('accessToken')
      
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await axios.get(
        `${API_URL}/api/biometric/status/${studentId}`, 
        {
          headers: { 
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get status')
      }

      return response.data.data
    } catch (error: any) {
      console.error('Get biometric status error:', error)
      
      if (error.response) {
        throw new Error(error.response.data.message || 'Failed to get status')
      } else {
        throw new Error(error.message || 'Failed to get biometric status')
      }
    }
  },

  /**
   * Delete a student's biometric data
   * @param studentId - Student ID
   */
  deleteBiometric: async (studentId: string): Promise<void> => {
    try {
      const token = localStorage.getItem('accessToken')
      
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await axios.delete(
        `${API_URL}/api/biometric/${studentId}`, 
        {
          headers: { 
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete biometric data')
      }
    } catch (error: any) {
      console.error('Delete biometric error:', error)
      
      if (error.response) {
        throw new Error(error.response.data.message || 'Failed to delete biometric data')
      } else {
        throw new Error(error.message || 'Failed to delete biometric data')
      }
    }
  },

  /**
   * Update existing biometric enrollment
   * @param studentId - Student ID
   * @param data - New biometric enrollment data
   */
  updateBiometric: async (
    studentId: string, 
    data: BiometricEnrollmentData
  ): Promise<Student> => {
    try {
      const token = localStorage.getItem('accessToken')
      
      if (!token) {
        throw new Error('Authentication required')
      }

      // First delete old enrollment
      await biometricService.deleteBiometric(studentId)
      
      // Then create new enrollment
      return await biometricService.enrollBiometric(data)
    } catch (error: any) {
      console.error('Update biometric error:', error)
      throw new Error(error.message || 'Failed to update biometric data')
    }
  },

  /**
   * Test Digital Persona device connectivity
   */
  testDevice: async (): Promise<{
    connected: boolean
    deviceName?: string
    error?: string
  }> => {
    try {
      // Check if Digital Persona SDK is available
      const DP = (window as any).Fingerprint || (window as any).DigitalPersona
      
      if (!DP) {
        return {
          connected: false,
          error: 'Digital Persona SDK not installed'
        }
      }

      // Try to get device list
      const devices = await DP.getDevices()
      
      if (!devices || devices.length === 0) {
        return {
          connected: false,
          error: 'No Digital Persona devices found'
        }
      }

      const u4500 = devices.find((d: any) => 
        d.name.includes('U.are.U 4500') || d.name.includes('U4500')
      )

      if (u4500) {
        return {
          connected: true,
          deviceName: u4500.name
        }
      }

      return {
        connected: false,
        error: 'Digital Persona U.4500 not found'
      }
    } catch (error: any) {
      return {
        connected: false,
        error: error.message || 'Device test failed'
      }
    }
  }
}

export { biometricService }