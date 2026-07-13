import { createServerSupabaseClient } from '@/lib/supabase'
import { availableProviders, resolveProvider, modelFor } from '@/lib/agent/providers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providers = availableProviders().map(p => ({
    id: p.id,
    label: p.label,
    model: modelFor(p),
  }))
  const defaultProvider = resolveProvider()

  return Response.json({
    providers,
    default: defaultProvider?.id || null,
  })
}
