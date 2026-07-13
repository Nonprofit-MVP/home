'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, X, Menu, LayoutDashboard, User, LogOut, FileText, Sparkles } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { createClient } from '@/lib/supabase'
import type { Paper } from '@/types'
import { cn, formatAuthors } from '@/lib/utils'

type NavUser = { id: string; name: string; email: string; username: string }

export function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<NavUser | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Paper[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  useEffect(() => {
  const supabase = getSupabase()

  function userFromSession(sessionUser: import('@supabase/supabase-js').User): NavUser {
    const meta = sessionUser.user_metadata || {}
    const email: string = sessionUser.email || ''
    const name: string = meta.full_name || meta.name || email.split('@')[0]
    return { id: sessionUser.id, name, email, username: '' }
  }

  async function loadUser(sessionUser: import('@supabase/supabase-js').User) {
    const base = userFromSession(sessionUser)
    setUser(base)
    const { data: profile } = await supabase
      .from('users')
      .select('username')
      .eq('id', sessionUser.id)
      .single()
    if (profile) setUser(u => u ? { ...u, username: profile.username } : null)
  }

  supabase.auth.getSession().then(({ data }: { data: { session: import('@supabase/supabase-js').Session | null } }) => {
    if (data.session?.user) loadUser(data.session.user)
  })

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
      loadUser(session.user)
    } else if (event === 'SIGNED_OUT') {
      setUser(null)
    }
  })

  return () => subscription.unsubscribe()
}, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [])

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true)
      const { data } = await getSupabase()
        .from('papers')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,abstract.ilike.%${searchQuery}%`)
        .neq('status', 'draft')
        .limit(6)
      setSearchResults((data as unknown as Paper[]) || [])
      setSearchLoading(false)
    }, 300)
  }, [searchQuery])

  const handleSignOut = async () => {
    await getSupabase().auth.signOut()
    setMobileMenuOpen(false)
    setDropdownOpen(false)
    router.push('/')
  }

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-white/8 bg-black">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <Image
              src="/logo_dark.png"
              width={1006}
              height={372}
              alt="Journality"
              priority
              className="h-6 w-auto transition-opacity group-hover:opacity-90"
            />
            <span className="sr-only">Journality</span>
          </Link>

          {/* Search — hidden on mobile */}
          <div ref={searchRef} className="hidden md:block flex-1 max-w-md relative">
            <div className={cn(
              'flex items-center gap-2 h-8 px-3 rounded-md border transition-all duration-150',
              searchOpen
                ? 'border-[#F5A3FF]/30 bg-white/5'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20'
            )}>
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="text"
                placeholder="Search papers, authors, tags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                className="flex-1 bg-transparent text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}>
                  <X className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400" />
                </button>
              )}
            </div>
            {searchOpen && (searchResults.length > 0 || searchLoading) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#111111] border border-white/10 rounded-lg shadow-2xl overflow-hidden">
                {searchLoading ? (
                  <div className="p-3 text-xs text-zinc-500 font-mono">Searching...</div>
                ) : (
                  searchResults.map(paper => (
                    <Link
                      key={paper.id}
                      href={`/papers/${paper.id}`}
                      onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-zinc-200 truncate">{paper.title}</p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          {formatAuthors(Array.isArray(paper.authors) ? paper.authors : [])}
                        </p>
                      </div>
                      <StatusBadge status={paper.status} size="sm" />
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Research assistant */}
          <Link
            href="/research"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono text-zinc-400 hover:text-[#F5A3FF] hover:bg-[#F5A3FF]/5 transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Research
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            {user ? (
              <>
                <div ref={dropdownRef} className="hidden md:block relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 transition-colors"
                  >
                    <Avatar src={undefined} name={user.name || user.email} size="sm" />
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[#111111] border border-white/10 rounded-lg shadow-2xl overflow-hidden">
                      <div className="px-3 py-2 border-b border-white/5">
                        <p className="text-xs font-mono text-zinc-300 font-medium">{user.name}</p>
                        <p className="text-[11px] text-zinc-600">{user.email}</p>
                      </div>
                      <Link href="/research" onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors">Research Assistant</Link>
                      <Link href="/dashboard" onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors">Dashboard</Link>
                      <Link href={`/profile/${user.username}`} onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors">Profile</Link>
                      <button onClick={handleSignOut} className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors border-t border-white/5">Sign out</button>
                    </div>
                  )}
                </div>
               
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden md:flex" onClick={() => router.push('/auth/login')}>Log in</Button>
                <Button variant="primary" size="sm" className="hidden md:flex" onClick={() => router.push('/papers/submit')}>Submit Research</Button>
                {/* Mobile: just log in */}
                <Button variant="ghost" size="sm" className="md:hidden text-xs" onClick={() => router.push('/auth/login')}>Log in</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Drawer */}
<div
  style={{ animation: 'slideIn 0.25s ease-out' }}
  className="absolute left-0 top-0 bottom-0 w-full bg-[#0d0d0d] flex flex-col"
  onClick={e => e.stopPropagation()}
>
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-white/8">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                <Image
                  src="/logo_dark.png"
                  width={1006}
                  height={372}
                  alt="Journality"
                  priority
                  className="h-6 w-auto"
                />
                <span className="sr-only">Journality</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search in drawer */}
            <div className="px-4 py-4 border-b border-white/5">
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-white/10 bg-white/[0.03]">
                <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search papers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 rounded-lg border border-white/10 overflow-hidden">
                  {searchResults.slice(0, 4).map(paper => (
                    <Link
                      key={paper.id}
                      href={`/papers/${paper.id}`}
                      onClick={() => { setMobileMenuOpen(false); setSearchQuery('') }}
                      className="flex items-start gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <p className="font-mono text-xs text-zinc-300 line-clamp-2 flex-1">{paper.title}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors font-mono"
              >
                <FileText className="w-4 h-4" />
                Browse Papers
              </Link>
              <Link
                href="/research"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors font-mono"
              >
                <Sparkles className="w-4 h-4" />
                Research Assistant
              </Link>
              {user && (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors font-mono"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link
                    href={`/profile/${user.username}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors font-mono"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                  <Link
                    href="/papers/submit"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#F5A3FF] hover:bg-[#F5A3FF]/5 transition-colors font-mono border border-[#F5A3FF]/20 mt-2"
                  >
                    <FileText className="w-4 h-4" />
                    Submit Research
                  </Link>
                </>
              )}
              {!user && (
                <Link
                  href="/papers/submit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#F5A3FF] hover:bg-[#F5A3FF]/5 transition-colors font-mono border border-[#F5A3FF]/20 mt-2"
                >
                  <FileText className="w-4 h-4" />
                  Submit Research
                </Link>
              )}
            </nav>

            {/* Bottom user section */}
            <div className="px-4 py-4 border-t border-white/8">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-1">
                    <Avatar src={undefined} name={user.name || user.email} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-zinc-300 font-medium truncate">{user.name}</p>
                      <p className="text-[11px] text-zinc-600 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-400/5 transition-colors font-mono"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              ) : (
                <Button variant="primary" className="w-full" onClick={() => { router.push('/auth/login'); setMobileMenuOpen(false) }}>
                  Log in
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
