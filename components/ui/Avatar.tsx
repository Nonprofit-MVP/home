'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { container: 'w-6 h-6', text: 'text-[10px]' },
  md: { container: 'w-8 h-8', text: 'text-xs' },
  lg: { container: 'w-10 h-10', text: 'text-sm' },
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const { container, text } = sizes[size]

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex items-center justify-center bg-zinc-800 border border-white/10 shrink-0',
        container,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size === 'lg' ? 40 : size === 'md' ? 32 : 24}
          height={size === 'lg' ? 40 : size === 'md' ? 32 : 24}
          className="object-cover w-full h-full"
        />
      ) : (
        <span className={cn('font-mono font-medium text-zinc-300', text)}>
          {initials}
        </span>
      )}
    </div>
  )
}
