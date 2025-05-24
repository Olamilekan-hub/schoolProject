// src/components/UI/Input.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import type { InputProps } from '../../types/components'

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  placeholder,
  type = 'text',
  required = false,
  disabled = false,
  error,
  helperText,
  className,
  onKeyPress,
  ...props
}, ref) => {
  const inputClasses = clsx(
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
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-error-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input