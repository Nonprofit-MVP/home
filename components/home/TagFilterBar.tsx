'use client'

import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FIELD_TAGS, cn } from '@/lib/utils'

interface TagFilterBarProps {
  selected: string | null
  onSelect: (tag: string | null) => void
}

export function TagFilterBar({ selected, onSelect }: TagFilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', updateArrows); ro.disconnect() }
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' })
  }

  return (
    <div className="relative max-w-7xl mx-auto px-4 flex items-center gap-1">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className={cn(
          'shrink-0 w-6 h-6 flex items-center justify-center rounded-full border transition-all duration-150',
          canScrollLeft
            ? 'border-white/15 text-zinc-400 hover:text-white hover:border-white/30 bg-[#0a0a0a]'
            : 'border-transparent text-transparent pointer-events-none'
        )}
        aria-label="Scroll left"
        tabIndex={canScrollLeft ? 0 : -1}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Chip scroll area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Fade overlays */}
        <div className={cn(
          'pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-[#0a0a0a] to-transparent transition-opacity duration-150',
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        )} />
        <div className={cn(
          'pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l from-[#0a0a0a] to-transparent transition-opacity duration-150',
          canScrollRight ? 'opacity-100' : 'opacity-0'
        )} />

        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto py-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            onClick={() => onSelect(null)}
            className={cn(
              'shrink-0 inline-flex items-center px-3 py-1 rounded-full border font-mono text-[11px] tracking-wide transition-all duration-150',
              selected === null
                ? 'border-[#F5A3FF]/50 bg-[#F5A3FF]/10 text-[#F5A3FF]'
                : 'border-white/10 bg-white/[0.03] text-zinc-500 hover:border-white/20 hover:text-zinc-300'
            )}
          >
            All
          </button>

          {FIELD_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => onSelect(tag === selected ? null : tag)}
              className={cn(
                'shrink-0 inline-flex items-center px-3 py-1 rounded-full border font-mono text-[11px] tracking-wide transition-all duration-150',
                selected === tag
                  ? 'border-[#F5A3FF]/50 bg-[#F5A3FF]/10 text-[#F5A3FF]'
                  : 'border-white/10 bg-white/[0.03] text-zinc-500 hover:border-white/20 hover:text-zinc-300'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className={cn(
          'shrink-0 w-6 h-6 flex items-center justify-center rounded-full border transition-all duration-150',
          canScrollRight
            ? 'border-white/15 text-zinc-400 hover:text-white hover:border-white/30 bg-[#0a0a0a]'
            : 'border-transparent text-transparent pointer-events-none'
        )}
        aria-label="Scroll right"
        tabIndex={canScrollRight ? 0 : -1}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
