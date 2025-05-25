// src/components/Attendance/AttendanceSessionForm.tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addDays } from 'date-fns'
import toast from 'react-hot-toast'

import type { AttendanceSession, CreateAttendanceSessionData } from '../../types/attendance'
import type { Course } from '../../types/course'
import { useCreateSession, useUpdateSession } from '../../hooks/useAttendance'

import Modal from '../UI/Modal'
import Input from '../UI/Input'
import Select from '../UI/Select'
import Button from '../UI/Button'

const sessionSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  sessionName: z.string().min(1, 'Session name is required'),
  sessionDate: z.string().min(1, 'Session date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional(),
  allowRemoteMarking: z.boolean().default(false),
})

interface AttendanceSessionFormProps {
  isOpen: boolean
  onClose: () => void
  session?: AttendanceSession | null
  courses: Course[]
  onSuccess: () => void
}

const AttendanceSessionForm: React.FC<AttendanceSessionFormProps> = ({
  isOpen,
  onClose,
  session,
  courses,
  onSuccess
}) => {
  const isEditing = !!session
  const { mutate: createSession, isPending: creating } = useCreateSession()
  const { mutate: updateSession, isPending: updating } = useUpdateSession()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<CreateAttendanceSessionData & { sessionDate: string; startTime: string; endTime?: string }>({
    resolver: zodResolver(sessionSchema),
    defaultValues: session ? {
      courseId: session.courseId,
      sessionName: session.sessionName,
      sessionDate: format(new Date(session.sessionDate), 'yyyy-MM-dd'),
      startTime: format(new Date(session.startTime), 'HH:mm'),
      endTime: session.endTime ? format(new Date(session.endTime), 'HH:mm') : '',
      allowRemoteMarking: session.allowRemoteMarking,
    } : {
      sessionDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: format(new Date(), 'HH:mm'),
      allowRemoteMarking: false,
    }
  })

  const selectedCourseId = watch('courseId')
  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  const onSubmit = async (data: CreateAttendanceSessionData & { sessionDate: string; startTime: string; endTime?: string }) => {
    try {
      const sessionData: CreateAttendanceSessionData = {
        courseId: data.courseId,
        sessionName: data.sessionName,
        sessionDate: data.sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
        allowRemoteMarking: data.allowRemoteMarking,
      }

      if (isEditing && session) {
        updateSession({ id: session.id, data: sessionData }, {
          onSuccess: () => {
            onSuccess()
            handleClose()
          }
        })
      } else {
        createSession(sessionData, {
          onSuccess: () => {
            onSuccess()
            handleClose()
          }
        })
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save session')
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const generateSessionName = () => {
    if (selectedCourse) {
      const today = format(new Date(), 'MMM dd, yyyy')
      const sessionName = `${selectedCourse.courseCode} - ${today}`
      setValue('sessionName', sessionName)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Attendance Session' : 'Create Attendance Session'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Course"
          {...register('courseId')}
          error={errors.courseId?.message}
          required
        >
          <option value="">Select a course</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.courseCode} - {course.courseTitle}
            </option>
          ))}
        </Select>

        <div>
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <Input
                label="Session Name"
                placeholder="e.g., Lecture 1: Introduction"
                {...register('sessionName')}
                error={errors.sessionName?.message}
                required
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={generateSessionName}
              disabled={!selectedCourseId}
            >
              Auto Generate
            </Button>
          </div>
          {selectedCourse && (
            <p className="text-sm text-gray-500 mt-1">
              Course: {selectedCourse.courseCode} - {selectedCourse.courseTitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Session Date"
            type="date"
            {...register('sessionDate')}
            error={errors.sessionDate?.message}
            required
            min={format(new Date(), 'yyyy-MM-dd')}
            max={format(addDays(new Date(), 365), 'yyyy-MM-dd')}
          />

          <Input
            label="Start Time"
            type="time"
            {...register('startTime')}
            error={errors.startTime?.message}
            required
          />
        </div>

        <Input
          label="End Time (Optional)"
          type="time"
          {...register('endTime')}
          error={errors.endTime?.message}
          helperText="Leave empty if session duration is flexible"
        />

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="allowRemoteMarking"
            {...register('allowRemoteMarking')}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="allowRemoteMarking" className="text-sm font-medium text-gray-700">
            Allow remote attendance marking
          </label>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Session Information:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Students can mark attendance during the specified time</li>
            <li>• Biometric verification will be required if enrolled</li>
            <li>• Session will automatically close if end time is specified</li>
            {watch('allowRemoteMarking') && (
              <li>• Remote marking link will be generated for this session</li>
            )}
          </ul>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={creating || updating}
            disabled={creating || updating}
          >
            {isEditing ? 'Update Session' : 'Create Session'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AttendanceSessionForm