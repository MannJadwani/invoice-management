import React from 'react'

const Input = React.forwardRef(({ className = '', ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900
        focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20
        dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-primary-400
        disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-900
        ${className}`}
      {...props}
    />
  )
})

Input.displayName = 'Input'

export default Input 