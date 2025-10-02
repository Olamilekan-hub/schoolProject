// src/hooks/useCourses.ts
import { useQuery } from '@tanstack/react-query'
import { coursesService } from '../services/courses'

export const useCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: coursesService.getAllCourses,
  })
}
