// src/hooks/useCourses.ts
import { useQuery } from '@tanstack/react-query'
import { courseService } from '../services/courses'

export const useCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: courseService.getCourses,
  })
}
