// src/components/UI/Alert.tsx
import React from 'react'
import { clsx } from 'clsx'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import type { AlertProps } from '../../types/components'

const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  dismissible = false,
  onDismiss,
  className,
}) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }

  const typeClasses = {
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-error-50 border-error-200 text-error-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  const iconClasses = {
    success: 'text-success-500',
    error: 'text-error-500',
    warning: 'text-warning-500',
    info: 'text-blue-500',
  }

  const Icon = icons[type]

  return (
    <div className={clsx('rounded-lg border p-4', typeClasses[type], className)}>
      <div className="flex">
        <Icon className={clsx('h-5 w-5 flex-shrink-0', iconClasses[type])} />
        <div className="ml-3 flex-1">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <p className={clsx('text-sm', title && 'mt-1')}>{message}</p>
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Alert