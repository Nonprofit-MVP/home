'use client'

import { useEffect, useState } from 'react'
import { FlaskConical, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export function ReaderModeBanner() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const checkRole = async (userId: string) => {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      if (data?.role === 'reader') setShow(true)
      else setShow(false)
    }

    // Initial check
    supabase.auth.getUser().then(({ data }: { data: { user: import('@supabase/supabase-js').User | null } }) => {
      if (data.user) checkRole(data.user.id)
    })

    // Re-check on auth or role change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: import('@supabase/supabase-js').AuthChangeEvent, session: import('@supabase/supabase-js').Session | null) => {
        if (session?.user) checkRole(session.user.id)
        else setShow(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (!show || dismissed) return null

  return (
    <div className="w-full bg-amber-400/10 border-b border-amber-400/20">
      <div className="max-w-7xl mx-auto px-4 h-9 flex items-center gap-2">
        <FlaskConical className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <p className="flex-1 text-xs font-mono text-amber-300">
          <span className="font-semibold">Reader mode is in beta</span>
          <span className="text-amber-400/70 ml-2">— some features may be limited or unavailable.</span>
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400/50 hover:text-amber-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
