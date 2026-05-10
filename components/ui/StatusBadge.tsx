'use client'

import { cn, STATUS_CONFIG } from '@/lib/utils'
import type { PaperStatus } from '@/types'

interface StatusBadgeProps {
  status: PaperStatus
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-mono font-medium tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  )
}
