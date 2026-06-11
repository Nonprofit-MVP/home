'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ArticleSearchFilters {
  query: string
  sortBy: 'newest' | 'viewed'
  dateRange: 'all' | 'week' | 'month' | 'year'
}

export const DEFAULT_ARTICLE_FILTERS: ArticleSearchFilters = {
  query: '',
  sortBy: 'newest',
  dateRange: 'all',
}

interface ArticleSearchBarProps {
  filters: ArticleSearchFilters
  onChange: (f: ArticleSearchFilters) => void
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'viewed', label: 'Most viewed' },
] as const

const DATE_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: 'year', label: 'Past year' },
] as const

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-mono transition-all',
          open
            ? 'border-sky-400/30 bg-sky-400/5 text-sky-300'
            : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
        )}
      >
        <span>{current?.label}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-[#111111] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs font-mono transition-colors',
                opt.value === value
                  ? 'text-sky-300 bg-sky-400/5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function hasActiveFilters(f: ArticleSearchFilters) {
  return f.query || f.sortBy !== 'newest' || f.dateRange !== 'all'
}

export function ArticleSearchBar({ filters, onChange }: ArticleSearchBarProps) {
  const [expanded, setExpanded] = useState(false)
  const active = hasActiveFilters(filters)

  const set = <K extends keyof ArticleSearchFilters>(key: K, val: ArticleSearchFilters[K]) =>
    onChange({ ...filters, [key]: val })

  const clear = () => {
    onChange(DEFAULT_ARTICLE_FILTERS)
    setExpanded(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex-1 flex items-center gap-2 h-9 px-3 rounded-lg border transition-all duration-200',
            expanded || filters.query
              ? 'border-sky-400/25 bg-sky-400/[0.03]'
              : 'border-white/10 bg-white/[0.03] hover:border-white/20'
          )}
        >
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder="Search articles, authors, excerpts..."
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none font-mono"
          />
          {filters.query && (
            <button onClick={() => set('query', '')} className="text-zinc-600 hover:text-zinc-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-mono transition-all shrink-0',
            expanded
              ? 'border-sky-400/30 bg-sky-400/10 text-sky-300'
              : active
              ? 'border-sky-400/20 bg-sky-400/5 text-sky-300'
              : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {active && !expanded && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 ml-0.5" />}
        </button>

        {active && (
          <button
            onClick={clear}
            className="flex items-center gap-1 h-9 px-2.5 rounded-lg text-xs font-mono text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/5">
          <span className="text-[11px] font-mono text-zinc-600 mr-1">Filter:</span>
          <Select
            value={filters.dateRange}
            options={DATE_OPTIONS}
            onChange={(v) => set('dateRange', v)}
          />
          <div className="w-px h-4 bg-white/8 mx-1" />
          <span className="text-[11px] font-mono text-zinc-600 mr-1">Sort:</span>
          <Select
            value={filters.sortBy}
            options={SORT_OPTIONS}
            onChange={(v) => set('sortBy', v)}
          />
        </div>
      )}
    </div>
  )
}
