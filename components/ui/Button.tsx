'use client'

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'outline', size = 'md', loading, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#F5A3FF]/30 focus:ring-offset-1 focus:ring-offset-[#0a0a0a]',
          size === 'sm' && 'px-3 py-1.5 text-xs',
          size === 'md' && 'px-4 py-2 text-sm',
          size === 'lg' && 'px-6 py-3 text-base',
          variant === 'primary' && 'bg-[#F5A3FF] text-black hover:bg-[#EB67FF] active:bg-[#E700FF]',
          variant === 'outline' && 'border border-white/15 text-zinc-300 hover:border-white/30 hover:text-white bg-transparent',
          variant === 'ghost' && 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent',
          variant === 'danger' && 'border border-red-500/30 text-red-400 hover:border-red-500/50 hover:text-red-300 bg-red-500/5',
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
