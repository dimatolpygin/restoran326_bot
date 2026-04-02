'use client'

import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs text-[#737373] font-medium">{label}</label>
        )}
        <textarea
          ref={ref}
          className={[
            'bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5]',
            'placeholder:text-[#737373] resize-none',
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

Textarea.displayName = 'Textarea'
