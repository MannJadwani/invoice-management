import React from 'react'
import { createPortal } from 'react-dom'
import { FaTimes } from 'react-icons/fa'

export const Input = React.forwardRef(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900
      focus:border-primary-500 focus:ring-primary-500 focus:ring-opacity-20 focus:ring-2 focus:outline-none
      dark:border-gray-600 dark:bg-gray-800 dark:text-white
      disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
      placeholder-gray-400 dark:placeholder-gray-500
      ${className}`}
    {...props}
  />
))
Input.displayName = 'Input'

export const Select = React.forwardRef(({ className = '', children, ...props }, ref) => (
  <select
    ref={ref}
    className={`block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900
      focus:border-primary-500 focus:ring-primary-500 focus:ring-opacity-20 focus:ring-2 focus:outline-none
      dark:border-gray-600 dark:bg-gray-800 dark:text-white
      disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
      ${className}`}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'

export const Textarea = React.forwardRef(({ className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    className={`block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900
      focus:border-primary-500 focus:ring-primary-500 focus:ring-opacity-20 focus:ring-2 focus:outline-none
      dark:border-gray-600 dark:bg-gray-800 dark:text-white
      disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
      placeholder-gray-400 dark:placeholder-gray-500
      ${className}`}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Label = ({ className = '', children, ...props }) => (
  <label
    className={`block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1
      ${className}`}
    {...props}
  >
    {children}
  </label>
)

export const FormGroup = ({ className = '', children, ...props }) => (
  <div className={`space-y-2 ${className}`} {...props}>
    {children}
  </div>
)

export const Button = React.forwardRef(({ 
  className = '', 
  variant = 'primary',
  size = 'md',
  children,
  ...props 
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg focus:outline-none transition-colors duration-200'
  
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  }

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})
Button.displayName = 'Button'

export const ErrorMessage = ({ children, className = '' }) => (
  children ? (
    <p className={`mt-1 text-sm text-red-600 dark:text-red-400 ${className}`}>
      {children}
    </p>
  ) : null
)

export const HelperText = ({ children, className = '' }) => (
  children ? (
    <p className={`mt-1 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {children}
    </p>
  ) : null
)

export const Badge = ({ 
  children, 
  className = '', 
  variant = 'primary' 
}) => {
  const variants = {
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

export const Card = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 
      rounded-lg shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export const Modal = ({ 
  isOpen, 
  onClose, 
  title,
  children,
  className = ''
}) => {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className={`relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 
          text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg ${className}`}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
} 