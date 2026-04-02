'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs text-[#737373] font-medium">{label}</label>
        )}
        <input
          ref={ref}
          className={[
            'bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5]',
            'placeholder:text-[#737373]',
            'focus:outline-none focus:border-[#6366f1] transition-colors',
            error ? 'border-red-500' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
