// src/components/UI/MultiSelect.tsx - Multi-select Dropdown Component
import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check, Plus } from 'lucide-react'
import { clsx } from 'clsx'

export interface Option {
  value: string
  label: string
  description?: string
}

interface MultiSelectProps {
  label?: string
  placeholder?: string
  options: Option[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  onAddNew?: () => void
  disabled?: boolean
  error?: string
  className?: string
  maxHeight?: string
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  placeholder = "Select options...",
  options,
  selectedValues,
  onChange,
  onAddNew,
  disabled = false,
  error,
  className,
  maxHeight = "200px"
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get selected option labels
  const selectedLabels = options
    .filter(option => selectedValues.includes(option.value))
    .map(option => option.label)

  const handleToggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  const handleRemoveOption = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedValues.filter(v => v !== value))
  }

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  return (
    <div className={clsx("relative", className)} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Main input/display area */}
      <div
        onClick={handleToggleDropdown}
        className={clsx(
          "min-h-[42px] w-full px-3 py-2 border rounded-md cursor-pointer transition-colors",
          "focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500",
          {
            "border-red-300 focus-within:ring-red-500 focus-within:border-red-500": error,
            "border-gray-300": !error,
            "bg-gray-50 cursor-not-allowed": disabled,
            "bg-white": !disabled,
          }
        )}
      >
        <div className="flex flex-wrap gap-1 items-center min-h-[26px]">
          {/* Selected items */}
          {selectedLabels.map((label, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 text-sm bg-primary-100 text-primary-800 rounded-md"
            >
              {label}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveOption(selectedValues[index], e)}
                  className="ml-1 text-primary-600 hover:text-primary-800 focus:outline-none"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}

          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedLabels.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm"
            disabled={disabled}
          />

          {/* Dropdown arrow */}
          <ChevronDown
            className={clsx(
              "h-4 w-4 text-gray-400 transition-transform ml-2 flex-shrink-0",
              { "rotate-180": isOpen }
            )}
          />
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg"
          style={{ maxHeight }}
        >
          <div className="overflow-y-auto">
            {/* Add new option button */}
            {onAddNew && (
              <button
                type="button"
                onClick={() => {
                  onAddNew()
                  setIsOpen(false)
                  setSearchTerm('')
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center text-primary-600 border-b border-gray-100"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Course
              </button>
            )}

            {/* Options list */}
            {filteredOptions.length === 0 && searchTerm ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No options found for "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggleOption(option.value)}
                    className={clsx(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between",
                      {
                        "bg-primary-50 text-primary-700": isSelected,
                      }
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {option.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                )
              })
            )}

            {filteredOptions.length === 0 && !searchTerm && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No options available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Helper text */}
      <p className="mt-1 text-xs text-gray-500">
        {selectedValues.length} course{selectedValues.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  )
}

export default MultiSelect