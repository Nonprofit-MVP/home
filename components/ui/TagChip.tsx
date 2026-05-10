'use client'

import { cn } from '@/lib/utils'

interface TagChipProps {
  tag: string
  size?: 'sm' | 'md'
  className?: string
  onClick?: () => void
}

export function TagChip({ tag, size = 'md', className, onClick }: TagChipProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded border border-white/10 font-mono text-zinc-400 bg-white/[0.04]',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        onClick && 'cursor-pointer hover:border-[#F5A3FF]/30 hover:text-[#F5A3FF] transition-colors',
        className
      )}
    >
      {tag}
    </span>
  )
}
