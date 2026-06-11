'use client'

import { cn } from '@/lib/utils'

export function ArticleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-mono font-medium tracking-wider px-2 py-0.5 text-[10px]',
        'text-sky-400 bg-sky-400/10 border-sky-400/20',
        className
      )}
    >
      ARTICLE
    </span>
  )
}
