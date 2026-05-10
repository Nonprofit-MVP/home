'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface BookmarkButtonProps {
  paperId: string
  isLoggedIn: boolean
  initialBookmarked: boolean
}

export function BookmarkButton({ paperId, isLoggedIn, initialBookmarked }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)

  const toggle = async () => {
    if (!isLoggedIn) {
      window.location.href = '/auth/login'
      return
    }
    // Optimistic update
    setBookmarked(prev => !prev)

    const supabase = createClient()
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return

    if (bookmarked) {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.user.id)
        .eq('paper_id', paperId)
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.user.id, paper_id: paperId })
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle}>
      <Bookmark
        className={cn(
          'w-3.5 h-3.5 transition-colors',
          bookmarked ? 'fill-[#F5A3FF] text-[#F5A3FF]' : ''
        )}
      />
      {bookmarked ? 'Bookmarked' : 'Bookmark'}
    </Button>
  )
}
