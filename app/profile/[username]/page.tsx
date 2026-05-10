import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { PaperCard } from '@/components/ui/PaperCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { User, Paper } from '@/types'
import { formatDate } from '@/lib/utils'
import { MapPin, Link as LinkIcon, BookOpen } from 'lucide-react'

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = await createServerSupabaseClient()

  // Fetch user + papers in parallel: user by username, papers via nested select
  const { data: user } = await supabase
    .from('users')
    .select('*, papers:papers(*, submitter_id)')
    .eq('username', params.username)
    .eq('papers.status', 'peer_verified') // only published
    .single()

  if (!user) notFound()

  // papers come from the nested join — fallback to empty
  const papers = ((user as any).papers ?? [])
    .filter((p: any) => p.status !== 'draft')
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12)

  const profile = user as unknown as User
  const userPapers = (papers as unknown as Paper[]) || []

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Profile header */}
      <div className="flex items-start gap-6 mb-10 pb-10 border-b border-white/8">
        <Avatar
          src={profile.avatar_url}
          name={profile.full_name}
          size="lg"
          className="w-16 h-16 text-base"
        />
        <div className="flex-1">
          <h1 className="font-mono text-xl font-bold text-white mb-1">{profile.full_name}</h1>
          <p className="text-xs font-mono text-zinc-500 mb-3">@{profile.username}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600">
            {profile.institution && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {profile.institution}
              </div>
            )}
            {profile.orcid && (
              <div className="flex items-center gap-1.5 font-mono">
                <LinkIcon className="w-3.5 h-3.5" />
                {profile.orcid}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {userPapers.length} papers
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm text-zinc-400 mt-3 max-w-lg">{profile.bio}</p>
          )}
        </div>

        <div className="shrink-0">
          <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${
            profile.role === 'editor'
              ? 'border-amber-400/20 text-amber-400 bg-amber-400/5'
              : profile.role === 'researcher'
              ? 'border-[#F5A3FF]/20 text-[#F5A3FF] bg-[#F5A3FF]/5'
              : 'border-white/10 text-zinc-600'
          }`}>
            {profile.role}
          </span>
        </div>
      </div>

      {/* Papers */}
      <div>
        <h2 className="font-mono text-sm font-medium text-zinc-500 uppercase tracking-widest mb-4">
          Published Papers
        </h2>

        {userPapers.length === 0 ? (
          <p className="text-sm text-zinc-700 font-mono">No published papers yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userPapers.map(paper => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
