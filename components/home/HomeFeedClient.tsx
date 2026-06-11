'use client'

import { useState } from 'react'
import { FeedColumn } from './FeedColumn'
import { TagFilterBar } from './TagFilterBar'
import { SearchBar, DEFAULT_FILTERS } from './SearchBar'
import { CommunitySection } from './CommunitySection'
import { ArticlesSection } from './ArticlesSection'
import { cn } from '@/lib/utils'
import type { SearchFilters } from './SearchBar'
import type { Article, Paper, User } from '@/types'

type FeedTab = 'featured' | 'new' | 'trending'

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'new', label: 'New' },
  { id: 'trending', label: 'Trending' },
]

interface TopContributor { user: User; paperCount: number }
interface RecentRep {
  id: string
  outcome: 'replicated' | 'partial' | 'failed'
  created_at: string
  researcher?: User
  paperTitle?: string
  paperId?: string
}

interface Props {
  initialFeatured: Paper[]
  initialNew: Paper[]
  initialTrending: Paper[]
  initialArticles: Article[]
  initialContributors: TopContributor[]
  initialReplications: RecentRep[]
}

export function HomeFeedClient({
  initialFeatured,
  initialNew,
  initialTrending,
  initialArticles,
  initialContributors,
  initialReplications,
}: Props) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FeedTab>('featured')
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)

  const isFiltered = !!(filters.query || filters.status || filters.sortBy !== 'newest' || filters.dateRange !== 'all' || selectedTag)

  const initialFor = (type: FeedType) =>
    !isFiltered ? (type === 'featured' ? initialFeatured : type === 'new' ? initialNew : initialTrending) : undefined

  return (
    <>
      <ArticlesSection initialArticles={initialArticles} />

      {/* Papers-only search + tags */}
      <div className="sticky top-14 z-30 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 border-t border-white/5">
        <div className="py-3">
          <SearchBar filters={filters} onChange={setFilters} />
        </div>
        <div className="pb-2.5">
          <TagFilterBar selected={selectedTag} onSelect={setSelectedTag} />
        </div>
      </div>

      <div className="md:hidden flex items-center border-b border-white/5 px-4 bg-[#0a0a0a]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 py-3 text-xs font-mono font-semibold tracking-widest uppercase transition-colors',
              activeTab === tab.id
                ? 'text-[#F5A3FF] border-b-2 border-[#F5A3FF]'
                : 'text-zinc-600 hover:text-zinc-400'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div id="feed" className="max-w-7xl mx-auto px-4 pt-6 pb-10">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-sm bg-[#F5A3FF]/40" />
            <h2 className="text-xs font-mono font-semibold text-zinc-400 tracking-widest uppercase">
              Papers
            </h2>
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-3 gap-6">
          <FeedColumn type="featured" tag={selectedTag} initialPapers={initialFor('featured')} search={filters} />
          <FeedColumn type="new"      tag={selectedTag} initialPapers={initialFor('new')}      search={filters} />
          <FeedColumn type="trending" tag={selectedTag} initialPapers={initialFor('trending')}  search={filters} />
        </div>

        <div className="md:hidden">
          <FeedColumn
            type={activeTab}
            tag={selectedTag}
            initialPapers={initialFor(activeTab)}
            search={filters}
          />
        </div>
      </div>

      <div className="border-t border-white/5 pt-10">
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-sm bg-[#F5A3FF]/40" />
            <h2 className="text-xs font-mono font-semibold text-zinc-400 tracking-widest uppercase">Community</h2>
          </div>
        </div>
        <CommunitySection
          initialContributors={initialContributors}
          initialReplications={initialReplications}
        />
      </div>
    </>
  )
}

type FeedType = 'featured' | 'new' | 'trending'
