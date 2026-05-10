'use client'

import { useState } from 'react'
import { ReviewPanel } from '@/components/paper/ReviewPanel'
import { ReplicationLedger } from '@/components/paper/ReplicationLedger'
import { ChangelogPanel } from '@/components/paper/ChangelogPanel'
import { EditRequestModal } from '@/components/paper/EditRequestModal'
import { Button } from '@/components/ui/Button'
import { Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Paper, Review, ReplicationAttempt, PaperVersion } from '@/types'

interface PaperTabsProps {
  paper: Paper
  reviews: Review[]
  replications: ReplicationAttempt[]
  versions: PaperVersion[]
  isLoggedIn: boolean
}

const TABS = ['Paper', 'Reviews', 'Replications', 'Changelog'] as const
type Tab = typeof TABS[number]

function arxivPdfFromSourceUrl(sourceUrl?: string) {
  if (!sourceUrl) return ''
  const match = sourceUrl.match(/https?:\/\/(?:export\.)?arxiv\.org\/abs\/([^?#\s]+)/i)
  if (!match?.[1]) return ''
  return `https://arxiv.org/pdf/${encodeURIComponent(match[1])}.pdf`
}

export function PaperTabs({ paper, reviews, replications, versions, isLoggedIn }: PaperTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Paper')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const effectivePdfUrl = paper.pdf_url || arxivPdfFromSourceUrl(paper.source_url)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-white/8 mb-6">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-xs font-mono transition-colors relative',
                activeTab === tab
                  ? 'text-white'
                  : 'text-zinc-600 hover:text-zinc-400'
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-px bg-[#F5A3FF]" />
              )}
              {tab === 'Reviews' && reviews.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-white/5 rounded-full px-1.5 py-0.5 text-zinc-600">
                  {reviews.length}
                </span>
              )}
              {tab === 'Replications' && replications.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-white/5 rounded-full px-1.5 py-0.5 text-zinc-600">
                  {replications.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'Paper' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditModalOpen(true)}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Request Edit
          </Button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'Paper' && (
        <div className="prose prose-invert prose-sm max-w-none">
          {effectivePdfUrl ? (
            <div className="bg-[#111111] border border-white/8 rounded-lg overflow-hidden">
              <iframe
                src={effectivePdfUrl}
                className="w-full h-[600px]"
                title="Paper PDF"
              />
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-600 border border-white/5 rounded-lg">
              <p className="font-mono text-sm">No PDF available</p>
              <p className="text-xs mt-1">
                {paper.source_url ? (
                  <a href={paper.source_url} target="_blank" rel="noopener noreferrer" className="text-[#F5A3FF] hover:underline">
                    View on arXiv →
                  </a>
                ) : 'The authors have not uploaded a PDF'}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Reviews' && (
        <ReviewPanel reviews={reviews} paperId={paper.id} />
      )}

      {activeTab === 'Replications' && (
        <ReplicationLedger
          attempts={replications}
          paperId={paper.id}
          isLoggedIn={isLoggedIn}
        />
      )}

      {activeTab === 'Changelog' && (
        <ChangelogPanel versions={versions} />
      )}

      <EditRequestModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        paperId={paper.id}
        paperTitle={paper.title}
      />
    </div>
  )
}
