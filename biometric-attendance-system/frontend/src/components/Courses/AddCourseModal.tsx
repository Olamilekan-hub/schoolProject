// src/components/Courses/AddCourseModal.tsx - Add New Course Modal
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import Button from '../UI/Button'
import Input from '../UI/Input'
import Select from '../UI/Select'
import Modal from '../UI/Modal'
import type { Option } from '../UI/MultiSelect'
import { coursesService } from '../../services/courses'

const createCourseSchema = z.object({
  courseCode: z
    .string()
    .min(1, 'Course code is required')
    .regex(/^[A-Z]{3}\d{3}$/, 'Course code must be in format: ABC123'),
  courseTitle: z.string().min(1, 'Course title is required'),
  description: z.string().optional(),
  creditUnits: z.number().int().min(1).max(6),
  semester: z.enum(['FIRST', 'SECOND']),
})

type CreateCourseFormData = z.infer<typeof createCourseSchema>

interface AddCourseModalProps {
  isOpen: boolean
  onClose: () => void
  onCourseAdded: (course: Option) => void
}

const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onCourseAdded,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateCourseFormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      creditUnits: 3,
      semester: 'FIRST',
    },
  })

  const onSubmit = async (data: CreateCourseFormData) => {
  try {
    // Use the coursesService instead of direct fetch
    const newCourse = await coursesService.createCourse(data);
    
    if (newCourse) {
      // Add the new course to the parent component
      onCourseAdded(newCourse);

      // Reset form and close modal
      reset();
      onClose();
    }
  } catch (error) {
    console.error('Error creating course:', error);
    // You might want to show an error toast here
  }
};

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Course"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Course Code"
            placeholder="e.g., CSC101"
            {...register('courseCode', {
              onChange: (e) => {
                // Auto-uppercase course code
                e.target.value = e.target.value.toUpperCase()
              },
            })}
            error={errors.courseCode?.message}
            maxLength={6}
          />

          <Select
            label="Credit Units"
            {...register('creditUnits', { valueAsNumber: true })}
            error={errors.creditUnits?.message}
          >
            <option value={1}>1 Credit</option>
            <option value={2}>2 Credits</option>
            <option value={3}>3 Credits</option>
            <option value={4}>4 Credits</option>
            <option value={5}>5 Credits</option>
            <option value={6}>6 Credits</option>
          </Select>
        </div>

        <Input
          label="Course Title"
          placeholder="e.g., Introduction to Programming"
          {...register('courseTitle')}
          error={errors.courseTitle?.message}
        />

        <Input
          label="Description (Optional)"
          placeholder="Brief description of the course"
          {...register('description')}
          error={errors.description?.message}
        />

        <Select
          label="Semester"
          {...register('semester')}
          error={errors.semester?.message}
        >
          <option value="FIRST">First Semester</option>
          <option value="SECOND">Second Semester</option>
        </Select>

        <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Course code should follow the format ABC123
            (3 letters + 3 numbers). Example: CSC101, MTH201, ENG102
          </p>
        </div>

        <div className="flex justify-end pt-4 space-x-3 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Add Course
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddCourseModal