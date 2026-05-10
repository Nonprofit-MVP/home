'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PaperCard, PaperCardSkeleton } from '@/components/ui/PaperCard'
import { InfiniteScroll } from '@/components/ui/InfiniteScroll'
import { createClient } from '@/lib/supabase'
import type { Paper } from '@/types'
import type { SearchFilters } from './SearchBar'

type FeedType = 'featured' | 'new' | 'trending'

interface FeedColumnProps {
  type: FeedType
  tag?: string | null
  initialPapers?: Paper[]
  search?: SearchFilters
}

const COLUMN_LABELS: Record<FeedType, string> = {
  featured: 'Featured',
  new: 'New',
  trending: 'Trending',
}

const PAGE_SIZE = 10
const supabase = createClient()

async function fetchPapers(
  type: FeedType,
  page: number,
  tag?: string | null,
  search?: SearchFilters
): Promise<Paper[]> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase.from('papers').select('*').range(from, to)

  // Status filter — search overrides column type
  if (search?.status) {
    query = query.eq('status', search.status)
  } else if (type === 'featured') {
    query = query.eq('status', 'peer_verified')
  } else {
    query = query.neq('status', 'draft')
  }

  // Tag filter
  if (tag) query = query.contains('field_tags', [tag])

  // Text search
  if (search?.query) {
    query = query.or(
      `title.ilike.%${search.query}%,abstract.ilike.%${search.query}%`
    )
  }

  // Date range
  if (search?.dateRange && search.dateRange !== 'all') {
    const now = new Date()
    const cutoff = new Date(now)
    if (search.dateRange === 'week') cutoff.setDate(now.getDate() - 7)
    else if (search.dateRange === 'month') cutoff.setMonth(now.getMonth() - 1)
    else if (search.dateRange === 'year') cutoff.setFullYear(now.getFullYear() - 1)
    query = query.gte('created_at', cutoff.toISOString())
  }

  // Sort
  const sortBy = search?.sortBy ?? (type === 'featured' ? 'cited' : type === 'trending' ? 'viewed' : 'newest')
  if (sortBy === 'cited') query = query.order('citation_count', { ascending: false })
  else if (sortBy === 'viewed') query = query.order('view_count', { ascending: false })
  else if (sortBy === 'replication') query = query.order('replication_score', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const { data } = await query
  return (data as unknown as Paper[]) ?? []
}

export function FeedColumn({ type, tag, initialPapers, search }: FeedColumnProps) {
  const isSearchActive = !!(search?.query || search?.status || (search?.sortBy && search.sortBy !== 'newest') || (search?.dateRange && search.dateRange !== 'all'))

  // Skip the initial fetch when server data is available and no filters are active
  const didInitialLoad = useRef(!!initialPapers && !tag && !isSearchActive)

  const [papers, setPapers] = useState<Paper[]>(initialPapers ?? [])
  const [loading, setLoading] = useState(!initialPapers)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState((initialPapers?.length ?? 0) === PAGE_SIZE)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (didInitialLoad.current) {
      didInitialLoad.current = false
      return
    }
    setLoading(true)
    setPapers([])
    setPage(0)
    fetchPapers(type, 0, tag, search).then(results => {
      setPapers(results)
      setHasMore(results.length === PAGE_SIZE)
      setLoading(false)
    })
  // Stringify search to trigger effect on value change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, tag, JSON.stringify(search)])

  const loadMore = useCallback(async () => {
    if (loadingMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    const results = await fetchPapers(type, nextPage, tag, search)
    setPapers(prev => [...prev, ...results])
    setHasMore(results.length === PAGE_SIZE)
    setPage(nextPage)
    setLoadingMore(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, page, loadingMore, tag, JSON.stringify(search)])

  return (
    <div className="flex flex-col">
      <div className="sticky top-14 z-10 bg-[#0a0a0a] pb-3 mb-3 border-b border-white/5">
        <div className="flex items-center gap-2 py-3">
          <div className="w-1 h-4 rounded-sm bg-[#F5A3FF]/40" />
          <h2 className="text-xs font-mono font-semibold text-zinc-400 tracking-widest uppercase">
            {COLUMN_LABELS[type]}
          </h2>
          {isSearchActive && (
            <span className="ml-auto text-[10px] font-mono text-zinc-600">
              {papers.length} result{papers.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <PaperCardSkeleton key={i} />)}
        </div>
      ) : papers.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-xl">
          <p className="font-mono text-sm text-zinc-700">No papers found</p>
          {isSearchActive && (
            <p className="text-xs text-zinc-800 font-mono mt-1">Try adjusting your filters</p>
          )}
        </div>
      ) : (
        <InfiniteScroll onLoadMore={loadMore} hasMore={hasMore} loading={loadingMore}>
          <div className="space-y-3">
            {papers.map(paper => <PaperCard key={paper.id} paper={paper} />)}
          </div>
          {loadingMore && (
            <div className="space-y-3 mt-3">
              {[1, 2].map(i => <PaperCardSkeleton key={i} />)}
            </div>
          )}
        </InfiniteScroll>
      )}
    </div>
  )
}
