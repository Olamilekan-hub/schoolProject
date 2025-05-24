// src/components/UI/Card.tsx
import React from 'react'
import { clsx } from 'clsx'
import type { CardProps } from '../../types/components'

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className,
  padding = 'md',
  border = true,
  shadow = true,
  hoverable = false,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const cardClasses = clsx(
    'card',
    border && 'border',
    shadow && 'shadow-sm',
    hoverable && 'hover:shadow-md transition-shadow duration-200',
    paddingClasses[padding],
    className
  )

  return (
    <div className={cardClasses}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

export default Card