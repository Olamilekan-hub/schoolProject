// src/services/auth.ts
import axios from 'axios'
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types/auth'

const API_URL = import.meta.env.VITE_API_URL

const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/auth/login`, credentials)
    return response.data
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/auth/register`, data)
    return response.data
  },

  logout: async (): Promise<void> => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      await axios.post(`${API_URL}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    }
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken
    })
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.put(`${API_URL}/auth/profile`, data, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    const token = localStorage.getItem('accessToken')
    await axios.put(`${API_URL}/auth/change-password`, {
      oldPassword,
      newPassword
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
  },
}

export { authService }