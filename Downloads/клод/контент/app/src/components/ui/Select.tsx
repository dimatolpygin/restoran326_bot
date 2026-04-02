'use client'

import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs text-[#737373] font-medium">{label}</label>
        )}
        <select
          ref={ref}
          className={[
            'bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5]',
            'focus:outline-none focus:border-[#6366f1] transition-colors cursor-pointer',
            error ? 'border-red-500' : '',
            className,
          ].join(' ')}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    )
  }
)

Select.displayName = 'Select'
