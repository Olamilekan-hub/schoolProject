// src/components/UI/Select.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import type { SelectProps } from '../../types/components'

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  className,
  children,
  ...props
}, ref) => {
  const selectClasses = clsx(
    'input',
    error && 'input-error',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  )

  return (
    <div className="w-full">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        disabled={disabled}
        className={selectClasses}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-error-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select