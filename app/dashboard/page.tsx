'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, Star, GitPullRequest, Bookmark as BookmarkIcon,
  Settings, Plus, Eye, Quote, BarChart2, Loader2
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Paper, Review, EditRequest, Bookmark, User } from '@/types'

type Section = 'papers' | 'reviews' | 'edit-requests' | 'bookmarks' | 'settings'

const supabase = createClient()

export default function DashboardPage() {
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router
  const [user, setUser] = useState<User | null>(null)
  const [section, setSection] = useState<Section>('papers')
  const [loading, setLoading] = useState(true)
  const [papers, setPapers] = useState<Paper[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [editRequests, setEditRequests] = useState<{ incoming: EditRequest[]; outgoing: EditRequest[] }>({ incoming: [], outgoing: [] })
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  useEffect(() => {
    async function loadData(userId: string, sessionMeta: Record<string, string>) {
      // Populate sidebar immediately from session metadata — no DB query needed
      setUser({
        id: userId,
        full_name: sessionMeta?.full_name || sessionMeta?.name || '',
        institution: sessionMeta?.institution || '',
        username: sessionMeta?.username || '',
        email: '',
        role: sessionMeta?.role || 'reader',
        bio: '',
        orcid: null,
        avatar_url: null,
        citation_count: 0,
        paper_count: 0,
        created_at: '',
      } as unknown as User)

      try {
        const papersRes = await supabase.from('papers').select('*').eq('submitter_id', userId).order('created_at', { ascending: false })
        const reviewsRes = await supabase.from('reviews').select('*, paper:papers(title, id, status)').eq('reviewer_id', userId).order('created_at', { ascending: false })
        const editOutRes = await supabase.from('edit_requests').select('*, paper:papers(title, id)').eq('requester_id', userId)
        const bookmarksRes = await supabase.from('bookmarks').select('*, paper:papers(*)').eq('user_id', userId)

        const userPaperIds = (papersRes.data || []).map((p: unknown) => (p as { id: string }).id)
        const { data: incomingRequests } = userPaperIds.length > 0
          ? await supabase.from('edit_requests').select('*, paper:papers(title, id), requester:users(full_name, username)').in('paper_id', userPaperIds)
          : { data: [] }

        setPapers((papersRes.data as unknown as Paper[]) || [])
        setReviews((reviewsRes.data as unknown as Review[]) || [])
        setEditRequests({
          incoming: (incomingRequests as unknown as EditRequest[]) || [],
          outgoing: (editOutRes.data as unknown as EditRequest[]) || [],
        })
        setBookmarks((bookmarksRes.data as unknown as Bookmark[]) || [])
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }

    // Use getSession() for the initial check — avoids the false null flash
    // that onAuthStateChange emits before restoring session from localStorage
    supabase.auth.getSession().then(({ data }: { data: { session: import('@supabase/supabase-js').Session | null } }) => {
  const session = data.session
  if (!session?.user) {
    routerRef.current.push('/auth/login')
    return
  }
  loadData(session.user.id, session.user.user_metadata)
})

    // Only watch for explicit sign-out after initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: import('@supabase/supabase-js').AuthChangeEvent) => {
        if (event === 'SIGNED_OUT') {
        routerRef.current.push('/auth/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#F5A3FF]" style={{ animation: 'spin 0.5s linear infinite' }} />
      </div>
    )
  }

  const navItems = [
    { id: 'papers', label: 'My Papers', icon: FileText, count: papers.length },
    { id: 'reviews', label: 'My Reviews', icon: Star, count: reviews.length },
    { id: 'edit-requests', label: 'Edit Requests', icon: GitPullRequest, count: editRequests.incoming.length + editRequests.outgoing.length },
    { id: 'bookmarks', label: 'Bookmarks', icon: BookmarkIcon, count: bookmarks.length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const

  return (
  <div className="max-w-7xl mx-auto px-4 py-10">
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <aside className="w-full md:w-52 md:shrink-0">
          <div className="mb-6">
            <p className="text-sm font-mono font-semibold text-zinc-300">{user?.full_name}</p>
            <p className="text-xs text-zinc-600">{user?.institution}</p>
          </div>
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id as Section)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                  section === item.id
                    ? 'bg-white/5 text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span className="font-mono text-xs whitespace-nowrap">{item.label}</span>
                {'count' in item && item.count! > 0 && (
                  <span className="text-[10px] bg-white/5 rounded-full px-1.5 text-zinc-600">{item.count}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {section === 'papers' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="font-mono text-base font-semibold text-zinc-200">My Papers</h1>
                <Link href="/papers/submit">
                  <Button variant="primary" size="sm">
                    <Plus className="w-3.5 h-3.5" />
                    New Paper
                  </Button>
                </Link>
              </div>

              {papers.length === 0 ? (
                <div className="text-center py-16 border border-white/5 rounded-xl">
                  <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                  <p className="font-mono text-sm text-zinc-600">No papers yet</p>
                  <Link href="/papers/submit">
                    <Button variant="outline" size="sm" className="mt-4">Submit your first paper</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['Title', 'Status', 'Submitted', 'Views', 'Citations', 'Score'].map(h => (
                          <th key={h} className="text-left pb-3 text-[11px] font-mono text-zinc-600 pr-4">{h}</th>
                        ))}
                        <th className="text-left pb-3 text-[11px] font-mono text-zinc-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {papers.map(paper => (
                        <tr key={paper.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-4 max-w-[220px]">
                            <Link href={`/papers/${paper.id}`} className="font-mono text-xs text-zinc-300 hover:text-white line-clamp-2">
                              {paper.title}
                            </Link>
                          </td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={paper.status} size="sm" />
                          </td>
                          <td className="py-3 pr-4 text-[11px] text-zinc-600 font-mono whitespace-nowrap">
                            {formatDate(paper.created_at)}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1 text-[11px] text-zinc-600 font-mono">
                              <Eye className="w-3 h-3" />
                              {paper.view_count}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1 text-[11px] text-zinc-600 font-mono">
                              <Quote className="w-3 h-3" />
                              {paper.citation_count}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1 text-[11px] text-zinc-600 font-mono">
                              <BarChart2 className="w-3 h-3" />
                              {paper.replication_score.toFixed(1)}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <Link href={`/papers/${paper.id}`} className="text-[11px] text-zinc-500 hover:text-zinc-300 font-mono">
                                View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {section === 'reviews' && (
            <div>
              <h1 className="font-mono text-base font-semibold text-zinc-200 mb-6">My Reviews</h1>
              {reviews.length === 0 ? (
                <div className="text-center py-16 border border-white/5 rounded-xl">
                  <Star className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                  <p className="font-mono text-sm text-zinc-600">No review assignments yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reviews.map(review => (
                    <div key={review.id} className="flex items-center gap-4 p-4 bg-[#111111] border border-white/8 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <Link href={`/papers/${review.paper_id}`} className="font-mono text-xs text-zinc-300 hover:text-white line-clamp-1">
                          {(review as any).paper?.title || review.paper_id}
                        </Link>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          Round {review.round} · {formatDate(review.created_at)}
                        </p>
                      </div>
                      {review.recommendation && (
                        <span className="text-[10px] font-mono text-zinc-500 capitalize">
                          {review.recommendation.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'edit-requests' && (
            <div className="space-y-8">
              <div>
                <h2 className="font-mono text-sm font-medium text-zinc-400 mb-4">
                  Incoming Requests <span className="text-zinc-700">({editRequests.incoming.length})</span>
                </h2>
                {editRequests.incoming.length === 0 ? (
                  <p className="text-xs text-zinc-700 font-mono">No incoming requests</p>
                ) : (
                  <div className="space-y-2">
                    {editRequests.incoming.map(req => (
                      <EditRequestRow key={req.id} request={req} type="incoming" />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h2 className="font-mono text-sm font-medium text-zinc-400 mb-4">
                  Outgoing Requests <span className="text-zinc-700">({editRequests.outgoing.length})</span>
                </h2>
                {editRequests.outgoing.length === 0 ? (
                  <p className="text-xs text-zinc-700 font-mono">No outgoing requests</p>
                ) : (
                  <div className="space-y-2">
                    {editRequests.outgoing.map(req => (
                      <EditRequestRow key={req.id} request={req} type="outgoing" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'bookmarks' && (
            <div>
              <h1 className="font-mono text-base font-semibold text-zinc-200 mb-6">Bookmarks</h1>
              {bookmarks.length === 0 ? (
                <div className="text-center py-16 border border-white/5 rounded-xl">
                  <BookmarkIcon className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                  <p className="font-mono text-sm text-zinc-600">No bookmarks yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bookmarks.map(b => b.paper && (
                    <div key={b.id}>
                      {/* compact paper card */}
                      <Link href={`/papers/${b.paper_id}`} className="block group">
                        <div className="bg-[#111111] border border-white/8 rounded-lg p-3 hover:-translate-y-0.5 transition-all">
                          <StatusBadge status={b.paper.status} size="sm" />
                          <p className="font-mono text-xs text-zinc-200 line-clamp-2 mt-2">{b.paper.title}</p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'settings' && user && (
            <SettingsForm user={user} onUpdate={setUser} />
          )}
        </div>
      </div>
    </div>
  )
}

function EditRequestRow({ request, type }: { request: EditRequest; type: 'incoming' | 'outgoing' }) {
  const STATUS_COLORS = {
    open: 'text-blue-400',
    approved: 'text-emerald-400',
    rejected: 'text-red-400',
    merged: 'text-[#F5A3FF]',
  }

  return (
    <div className="flex items-start gap-4 p-4 bg-[#111111] border border-white/8 rounded-lg">
      <div className="flex-1 min-w-0">
        <Link href={`/papers/${request.paper_id}`} className="font-mono text-xs text-zinc-300 hover:text-white line-clamp-1">
          {(request as any).paper?.title || request.paper_id}
        </Link>
        <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-1">{request.proposed_changes}</p>
        {type === 'outgoing' && request.reviewer_comment && (
          <p className="text-[11px] text-zinc-500 mt-1 italic">"{request.reviewer_comment}"</p>
        )}
        {type === 'incoming' && (request as any).requester && (
          <p className="text-[11px] text-zinc-600 mt-0.5">
            by {(request as any).requester?.full_name}
          </p>
        )}
      </div>
      <span className={`text-[10px] font-mono capitalize ${STATUS_COLORS[request.status]}`}>
        {request.status}
      </span>
    </div>
  )
}

function SettingsForm({ user, onUpdate }: { user: User; onUpdate: (u: User) => void }) {
  const [form, setForm] = useState({ full_name: user.full_name, institution: user.institution, bio: user.bio || '' })
  const [role, setRole] = useState<'reader' | 'researcher'>(
    user.role === 'reader' ? 'reader' : 'researcher'
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [togglingRole, setTogglingRole] = useState(false)

  useEffect(() => {
    supabase.from('users').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        onUpdate(data as unknown as User)
        setForm({ full_name: (data as any).full_name, institution: (data as any).institution, bio: (data as any).bio || '' })
        if ((data as any).role === 'reader' || (data as any).role === 'researcher') {
          setRole((data as any).role)
        }
      }
    })
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('users').update(form).eq('id', user.id)
    onUpdate({ ...user, ...form })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  const handleRoleToggle = async (newRole: 'reader' | 'researcher') => {
    if (newRole === role || togglingRole) return
    if (user.role === 'editor' || user.role === 'admin') return
    setTogglingRole(true)
    setRole(newRole)
    const supabase = createClient()
    await supabase.from('users').update({ role: newRole }).eq('id', user.id)
    onUpdate({ ...user, role: newRole })
    setTogglingRole(false)
  }

  const canToggleRole = user.role !== 'editor' && user.role !== 'admin'

  return (
    <div>
      <h1 className="font-mono text-base font-semibold text-zinc-200 mb-6">Settings</h1>

      {/* Role toggle */}
      <div className="max-w-md mb-8 p-4 bg-white/[0.02] border border-white/8 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-mono font-semibold text-zinc-300">Account Mode</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              {canToggleRole
                ? 'Switch between reader and researcher access'
                : 'Your role is managed by administrators'}
            </p>
          </div>
          {togglingRole && (
            <span className="text-[10px] font-mono text-zinc-600 animate-pulse">Saving…</span>
          )}
        </div>
        <div className={`flex items-center rounded-lg border p-1 gap-1 ${canToggleRole ? 'border-white/10 bg-white/[0.02]' : 'border-white/5 opacity-50'}`}>
          {(['reader', 'researcher'] as const).map(r => (
            <button
              key={r}
              disabled={!canToggleRole}
              onClick={() => handleRoleToggle(r)}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-mono font-medium transition-all duration-150 capitalize ${
                role === r
                  ? r === 'reader'
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/20'
                    : 'bg-[#F5A3FF]/10 text-[#F5A3FF] border border-[#F5A3FF]/20'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {role === 'reader' && (
          <p className="text-[11px] text-amber-400/70 font-mono mt-2">
            ⚠ Reader mode is in beta. Some features may be limited.
          </p>
        )}
      </div>

      <form onSubmit={handleSave} className="max-w-md space-y-4">
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5">Full Name</label>
          <input
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5">Institution</label>
          <input
            value={form.institution}
            onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
            className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5">Bio</label>
          <textarea
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            rows={3}
            className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30 resize-none"
          />
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
