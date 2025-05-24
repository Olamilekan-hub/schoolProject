// src/pages/Profile.tsx
import React, { useState } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Key, 
  Shield,
  Edit3,
  Save,
  X
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { authService } from '../services/auth'

import Card from '../components/UI/Card'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Modal from '../components/UI/Modal'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const Profile: React.FC = () => {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
      employeeId: user?.employeeId || ''
    }
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    reset: resetPassword,
    watch
  } = useForm()

  const handleProfileUpdate = async (data: any) => {
    try {
      await authService.updateProfile(data)
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    }
  }

  const handlePasswordChange = async (data: any) => {
    try {
      await authService.changePassword(data.currentPassword, data.newPassword)
      toast.success('Password changed successfully!')
      setShowPasswordModal(false)
      resetPassword()
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password')
    }
  }

  const handleCancelEdit = () => {
    reset()
    setIsEditing(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>
        
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Profile Information */}
      <Card title="Personal Information" className="p-6">
        <form onSubmit={handleSubmit(handleProfileUpdate)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="h-10 w-10 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-gray-600 capitalize">{user?.role.toLowerCase()}</p>
                <p className="text-sm text-gray-500">{user?.department}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="First Name"
              {...register('firstName', { required: 'First name is required' })}
              error={errors.firstName?.message as string}
              disabled={!isEditing}
            />
            
            <Input
              label="Last Name"
              {...register('lastName', { required: 'Last name is required' })}
              error={errors.lastName?.message as string}
              disabled={!isEditing}
            />
            
            <Input
              label="Email Address"
              type="email"
              {...register('email', { required: 'Email is required' })}
              error={errors.email?.message as string}
              disabled={!isEditing}
            />
            
            <Input
              label="Phone Number"
              type="tel"
              {...register('phone')}
              error={errors.phone?.message as string}
              disabled={!isEditing}
            />
            
            <Input
              label="Department"
              {...register('department')}
              error={errors.department?.message as string}
              disabled={!isEditing}
            />
            
            <Input
              label="Employee ID"
              {...register('employeeId')}
              error={errors.employeeId?.message as string}
              disabled={!isEditing}
            />
          </div>

          {isEditing && (
            <div className="mt-6 flex justify-end space-x-4">
              <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Account Security */}
      <Card title="Account Security" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Key className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Password</p>
                <p className="text-sm text-gray-600">Last changed 30 days ago</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowPasswordModal(true)}>
              Change Password
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Not enabled</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" disabled>
              Enable 2FA
            </Button>
          </div>
        </div>
      </Card>

      {/* Account Statistics */}
      <Card title="Account Statistics" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">
              {user?.courses?.length || 0}
            </p>
            <p className="text-sm text-gray-600">Courses Teaching</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">156</p>
            <p className="text-sm text-gray-600">Students Managed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">42</p>
            <p className="text-sm text-gray-600">Sessions Created</p>
          </div>
        </div>
      </Card>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          resetPassword()
        }}
        title="Change Password"
        size="md"
      >
        <form onSubmit={handlePasswordSubmit(handlePasswordChange)} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            {...registerPassword('currentPassword', { 
              required: 'Current password is required' 
            })}
            error={passwordErrors.currentPassword?.message as string}
          />
          
          <Input
            label="New Password"
            type="password"
            {...registerPassword('newPassword', { 
              required: 'New password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' }
            })}
            error={passwordErrors.newPassword?.message as string}
          />
          
          <Input
            label="Confirm New Password"
            type="password"
            {...registerPassword('confirmPassword', { 
              required: 'Please confirm your password',
              validate: (value) => 
                value === watch('newPassword') || 'Passwords do not match'
            })}
            error={passwordErrors.confirmPassword?.message as string}
          />

          <div className="flex justify-end space-x-4 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setShowPasswordModal(false)
                resetPassword()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isPasswordSubmitting}>
              Change Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Profile