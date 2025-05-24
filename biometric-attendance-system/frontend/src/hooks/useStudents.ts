// src/hooks/useStudents.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentService } from '../services/students'
import type { Student, CreateStudentData, UpdateStudentData, StudentStatus } from '../types/student'

interface UseStudentsOptions {
  search?: string
  courseId?: string
  status?: StudentStatus
  page?: number
  limit?: number
}

export const useStudents = (options: UseStudentsOptions = {}) => {
  return useQuery({
    queryKey: ['students', options],
    queryFn: () => studentService.getStudents(options),
  })
}

export const useCreateStudent = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: studentService.createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    }
  })
}

export const useUpdateStudent = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: studentService.updateStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    }
  })
}

export const useDeleteStudent = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: studentService.deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    }
  })
}