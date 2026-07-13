import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ResearchWorkspace } from '@/components/research/ResearchWorkspace'
import type { AgentConversation } from '@/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Research Assistant — Journality',
  description: 'AI research assistant for scientific literature search with cited sources.',
}

export default async function ResearchPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: conversations } = await supabase
    .from('agent_conversations')
    .select('id,title,context,provider,model,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  return <ResearchWorkspace initialConversations={(conversations as AgentConversation[]) || []} />
}
