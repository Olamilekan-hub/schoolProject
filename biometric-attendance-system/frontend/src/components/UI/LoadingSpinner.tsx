// src/components/UI/LoadingSpinner.tsx
import React from 'react'
import { clsx } from 'clsx'
import type { LoadingSpinnerProps } from '../../types/components'

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  const colorClasses: any = {
    primary: 'border-primary-600',
    gray: 'border-gray-600',
    white: 'border-white',
  }

  return (
    <div
      className={clsx(
        'spinner',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  )
}

export default LoadingSpinner