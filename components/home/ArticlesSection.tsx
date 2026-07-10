'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { ArticleCard, ArticleCardSkeleton } from '@/components/ui/ArticleCard'
import {
  ArticleSearchBar,
  DEFAULT_ARTICLE_FILTERS,
  type ArticleSearchFilters,
} from './ArticleSearchBar'
import { createClient } from '@/lib/supabase'
import {
  ARTICLE_EDITIONS,
  cn,
  type ArticleLocale,
} from '@/lib/utils'
import type { Article } from '@/types'

const PAGE_SIZE = 9
const supabase = createClient()

interface ArticlesSectionProps {
  initialArticles: Article[]
}

function dateCutoff(range: ArticleSearchFilters['dateRange']): string | null {
  if (range === 'all') return null
  const now = new Date()
  const days = range === 'week' ? 7 : range === 'month' ? 30 : 365
  now.setDate(now.getDate() - days)
  return now.toISOString()
}

async function fetchArticles({
  locale,
  tag,
  filters,
  page,
}: {
  locale: ArticleLocale
  tag: string | null
  filters: ArticleSearchFilters
  page: number
}): Promise<Article[]> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('articles')
    .select('*')
    .contains('field_tags', [locale])

  if (tag) {
    query = query.contains('field_tags', [tag])
  }

  if (filters.query.trim()) {
    const q = filters.query.trim()
    query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
  }

  const cutoff = dateCutoff(filters.dateRange)
  if (cutoff) {
    query = query.gte('published_at', cutoff)
  }

  if (filters.sortBy === 'viewed') {
    query = query.order('view_count', { ascending: false })
  } else {
    query = query.order('published_at', { ascending: false })
  }

  const { data, error } = await query.range(from, to)
  if (error) throw error
  return (data ?? []) as Article[]
}

function EditionDropdown({
  locale,
  onChange,
}: {
  locale: ArticleLocale
  onChange: (locale: ArticleLocale) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = ARTICLE_EDITIONS.find((e) => e.value === locale)

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
        <div className="absolute top-full right-0 mt-1 min-w-[180px] bg-[#111111] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
          {ARTICLE_EDITIONS.map((edition) => (
            <button
              key={edition.value}
              onClick={() => {
                onChange(edition.value)
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs font-mono transition-colors',
                edition.value === locale
                  ? 'text-sky-300 bg-sky-400/5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              )}
            >
              {edition.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ArticlesSection({ initialArticles }: ArticlesSectionProps) {
  const [locale, setLocale] = useState<ArticleLocale>('canada-english')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [filters, setFilters] = useState<ArticleSearchFilters>(DEFAULT_ARTICLE_FILTERS)
  const [articles, setArticles] = useState(initialArticles)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(initialArticles.length >= PAGE_SIZE)
  const [initialized, setInitialized] = useState(false)

  const isFiltered =
    locale !== 'canada-english'
    || !!selectedTag
    || !!filters.query
    || filters.sortBy !== 'newest'
    || filters.dateRange !== 'all'

  const loadArticles = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true)
      try {
        const data = await fetchArticles({
          locale,
          tag: selectedTag,
          filters,
          page: pageNum,
        })
        setArticles((current) => (append ? [...current, ...data] : data))
        setPage(pageNum)
        setHasMore(data.length === PAGE_SIZE)
      } catch {
        if (!append) setArticles([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    [locale, selectedTag, filters]
  )

  useEffect(() => {
    if (!initialized) {
      setInitialized(true)
      return
    }
    loadArticles(0, false)
  }, [locale, selectedTag, filters, loadArticles, initialized])

  function handleLocaleChange(nextLocale: ArticleLocale) {
    setLocale(nextLocale)
    if (selectedTag === 'canada-english' || selectedTag === 'canada-french') {
      setSelectedTag(null)
    }
  }

  async function loadMore() {
    if (loading || !hasMore) return
    await loadArticles(page + 1, true)
  }

  return (
    <section id="articles" className="border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-3">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-sm bg-sky-400/50" />
              <h2 className="text-xs font-mono font-semibold text-zinc-400 tracking-widest uppercase">
                Articles
              </h2>
            </div>
            <EditionDropdown locale={locale} onChange={handleLocaleChange} />
          </div>
        </div>
      <div className="sticky top-14 z-30 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        

        <div className="py-3 border-t border-white/5">
          <ArticleSearchBar filters={filters} onChange={setFilters} />

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-10">
        {loading && articles.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <ArticleCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-sm font-mono text-zinc-600 text-center py-12">
            No articles found for this edition.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
              {loading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <ArticleCardSkeleton key={`loading-${index}`} />
                ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-mono text-zinc-400 border border-white/10 rounded hover:border-white/20 hover:text-zinc-200 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading articles...' : 'Load more articles'}
                </button>
              </div>
            )}
          </>
        )}

      
      </div>
    </section>
  )
}
