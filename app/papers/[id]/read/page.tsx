import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PaperReader } from '@/components/paper/PaperReader'
import type { Paper } from '@/types'

interface PageProps {
  params: { id: string }
}

function arxivPdfFromSourceUrl(sourceUrl?: string) {
  if (!sourceUrl) return ''
  const match = sourceUrl.match(/https?:\/\/(?:export\.)?arxiv\.org\/abs\/([^?#\s]+)/i)
  if (!match?.[1]) return ''
  return `https://arxiv.org/pdf/${encodeURIComponent(match[1])}.pdf`
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('papers')
    .select('title')
    .eq('id', params.id)
    .single()
  return {
    title: data ? `Reader — ${data.title}` : 'Reader — Journality',
  }
}

export default async function PaperReaderPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('papers').select('*').eq('id', params.id).single()
  if (!data) notFound()

  const paper = data as unknown as Paper
  const pdfUrl = paper.pdf_url || arxivPdfFromSourceUrl(paper.source_url)

  return <PaperReader paper={paper} pdfUrl={pdfUrl || undefined} />
}
