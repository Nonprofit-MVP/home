'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Plus, Trash2, ChevronRight, ChevronLeft, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TagChip } from '@/components/ui/TagChip'
import { PaperCard } from '@/components/ui/PaperCard'
import { createClient } from '@/lib/supabase'
import { FIELD_TAGS, generateDOI } from '@/lib/utils'
import type { Author, Paper } from '@/types'

const STEPS = ['Upload', 'Metadata', 'AI Preview', 'Submit']

function normalizeArxivId(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return ''
  return trimmed
    .replace(/^https?:\/\/arxiv\.org\/abs\//i, '')
    .replace(/^https?:\/\/export\.arxiv\.org\/abs\//i, '')
    .replace(/^arxiv:/i, '')
    .trim()
}

function arxivAbsUrl(arxivId: string) {
  const id = normalizeArxivId(arxivId)
  return id ? `https://arxiv.org/abs/${encodeURIComponent(id)}` : ''
}

function arxivPdfUrl(arxivId: string) {
  const id = normalizeArxivId(arxivId)
  return id ? `https://arxiv.org/pdf/${encodeURIComponent(id)}.pdf` : ''
}

interface FormData {
  title: string
  abstract: string
  authors: Author[]
  field_tags: string[]
  arxivId: string
  pdfFile: File | null
  tldr: string
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-xs transition-all ${
              i < current
                ? 'bg-[#F5A3FF] border-[#F5A3FF] text-black'
                : i === current
                ? 'border-[#F5A3FF] text-[#F5A3FF]'
                : 'border-white/10 text-zinc-700'
            }`}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] font-mono mt-1 ${i === current ? 'text-zinc-400' : 'text-zinc-700'}`}>
              {step}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-16 h-px mx-2 mb-4 ${i < current ? 'bg-[#F5A3FF]/50' : 'bg-white/5'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function SubmitPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [isDraggingPdf, setIsDraggingPdf] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    abstract: '',
    authors: [{ name: '', institution: '', email: '', orcid: '' }],
    field_tags: [],
    arxivId: '',
    pdfFile: null,
    tldr: '',
  })
  const [arxivLoading, setArxivLoading] = useState(false)
  const [arxivError, setArxivError] = useState('')
  const [tldrLoading, setTldrLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [relatedPapers, setRelatedPapers] = useState<Paper[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [pdfUrl, setPdfUrl] = useState('')

  useEffect(() => {
  const supabase = createClient()
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) {
      router.push('/auth/login')
      return
    }
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (profile && (profile.role === 'researcher' || profile.role === 'editor' || profile.role === 'admin')) {
      setAuthorized(true)
    }
    setAuthChecked(true)
  })
  return () => subscription.unsubscribe()
}, [router])

  const fetchArxiv = async () => {
    if (!formData.arxivId.trim()) return
    setArxivLoading(true)
    setArxivError('')
    try {
      const id = formData.arxivId.trim().replace('https://arxiv.org/abs/', '')
      const res = await fetch(`/api/papers/arxiv?id=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch arXiv')
      setFormData(f => ({
        ...f,
        title: data.title || f.title,
        abstract: data.abstract || f.abstract,
        authors: data.authors?.length ? data.authors : f.authors,
      }))
    } catch (err: any) {
      setArxivError(err.message)
    } finally {
      setArxivLoading(false)
    }
  }

  const handlePdfUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert('File too large. Maximum 50MB.')
      return
    }
    setFormData(f => ({ ...f, pdfFile: file }))
    const supabase = createClient()
    const safeName = file.name.replace(/[^\w.\-()+\s]/g, '_')
    const fileName = `${Date.now()}-${safeName}`
    setUploadProgress(10)

    try {
      setUploadingPdf(true)
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 90_000)

      const { data, error } = await supabase.storage
        .from('papers')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: false,
          signal: controller.signal,
          onUploadProgress: (p: { loaded: number; total: number }) =>
            setUploadProgress(Math.round((p.loaded / p.total) * 100)),
        } as any)

      window.clearTimeout(timeout)

      if (error) {
        setUploadProgress(0)
        setFormData(f => ({ ...f, pdfFile: null }))
        alert(
          `PDF upload failed: ${error.message}\n\n` +
            `Supabase Storage checks:\n` +
            `- Bucket name: papers\n` +
            `- Bucket access/policies allow INSERT for your user\n`
        )
        return
      }

      if (data) {
        const { data: url } = supabase.storage.from('papers').getPublicUrl(fileName)
        setPdfUrl(url.publicUrl)
      }
      setUploadProgress(100)
    } catch (err: any) {
      setUploadProgress(0)
      setFormData(f => ({ ...f, pdfFile: null }))
      const msg =
        err?.name === 'AbortError'
          ? 'Upload timed out after 90s (network/CORS/policy issue).'
          : (err?.message || String(err))
      alert(`PDF upload error: ${msg}\n\nOpen DevTools → Network/Console for details.`)
    } finally {
      setUploadingPdf(false)
    }
  }

  const goToStep2 = () => setStep(1)

  const goToStep3 = async () => {
    setStep(2)
    setTldrLoading(true)
    setAiError('')
    try {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 45_000)

      const [tldrRes, relatedRes] = await Promise.all([
        fetch('/api/ai/tldr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: formData.title, abstract: formData.abstract }),
          signal: controller.signal,
        }),
        fetch('/api/ai/related', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: formData.title, abstract: formData.abstract, tags: formData.field_tags }),
          signal: controller.signal,
        }),
      ])

      window.clearTimeout(timeout)

      if (tldrRes.ok) {
        const d = await tldrRes.json()
        setFormData(f => ({ ...f, tldr: d.tldr || f.tldr }))
      } else {
        const err = await tldrRes.json().catch(() => ({}))
        setAiError(err?.error || 'Failed to generate AI TL;DR.')
        // Fallback: show a basic excerpt so the UI isn't blank
        setFormData(f => ({ ...f, tldr: f.tldr || f.abstract.slice(0, 240).trim() }))
      }

      if (relatedRes.ok) {
        const d = await relatedRes.json()
        setRelatedPapers(d.papers || [])
      } else {
        const err = await relatedRes.json().catch(() => ({}))
        setAiError(prev => prev || err?.error || 'Failed to find related papers.')
      }
    } catch (err: any) {
      console.error('AI preview error:', err)
      const msg =
        err?.name === 'AbortError'
          ? 'AI preview timed out after 45s. Check your AI API key and server logs.'
          : (err?.message || String(err))
      setAiError(msg)
      setFormData(f => ({ ...f, tldr: f.tldr || f.abstract.slice(0, 240).trim() }))
    } finally {
      setTldrLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!agreed) return
    setSubmitting(true)
    setSubmitError('')
    const doi = generateDOI()
    const supabase = createClient()
    try {
      if (uploadingPdf) {
        setSubmitError('Your PDF is still uploading. Please wait until the upload finishes.')
        return
      }
      if (formData.pdfFile && !pdfUrl) {
        setSubmitError('PDF upload did not complete. Please re-upload the PDF and try again.')
        return
      }

      const { data: userResult, error: userError } = await supabase.auth.getUser()
      if (userError) {
        setSubmitError(`Auth error: ${userError.message}`)
        return
      }
      if (!userResult.user) {
        setSubmitError('Your session expired. Please log in again.')
        router.push('/auth/login')
        return
      }

      const sourceUrl = arxivAbsUrl(formData.arxivId)
      const fallbackPdfUrl = pdfUrl || arxivPdfUrl(formData.arxivId) || null

      const insertPromise = supabase
        .from('papers')
        .insert({
          title: formData.title,
          abstract: formData.abstract,
          tldr: formData.tldr,
          authors: formData.authors.filter(a => a.name) as any,
          submitter_id: userResult.user.id,
          status: 'under_review',
          field_tags: formData.field_tags,
          doi,
          pdf_url: fallbackPdfUrl,
          source_url: sourceUrl || null,
          published_at: new Date().toISOString(),
        })
        .select()
        .single()

      let timeoutId: number | undefined
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error('Publish timed out. Please try again.')),
          30_000
        )
      })

      const { data: paper, error } = await Promise.race([insertPromise, timeoutPromise]).finally(() => {
        if (timeoutId) window.clearTimeout(timeoutId)
      })
      if (error) {
        setSubmitError(error.message)
        return
      }

      if (paper) {
        router.push(`/papers/${paper.id}`)
      } else {
        setSubmitError('Publish failed: no paper returned.')
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Publish failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#F5A3FF]" style={{ animation: 'spin 0.5s linear infinite' }} />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="font-mono text-sm text-zinc-400 mb-2">Researcher account required</p>
        <p className="text-xs text-zinc-600 mb-6">You need a researcher role to submit papers.</p>
        <Button variant="primary" size="sm" onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    )
  }

  const filteredTags = FIELD_TAGS.filter(t =>
    t.includes(tagSearch.toLowerCase()) && !formData.field_tags.includes(t)
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-mono text-2xl font-bold text-white mb-2">Submit Research</h1>
        <p className="text-sm text-zinc-500">Share your work with the research community</p>
      </div>

      <StepIndicator current={step} />

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="space-y-6">
          {/* PDF drop zone */}
          <div>
            <label
              onDragEnter={e => {
                e.preventDefault()
                e.stopPropagation()
                setIsDraggingPdf(true)
              }}
              onDragOver={e => {
                e.preventDefault()
                e.stopPropagation()
                setIsDraggingPdf(true)
              }}
              onDragLeave={e => {
                e.preventDefault()
                e.stopPropagation()
                setIsDraggingPdf(false)
              }}
              onDrop={e => {
                e.preventDefault()
                e.stopPropagation()
                setIsDraggingPdf(false)
                const file = e.dataTransfer?.files?.[0]
                if (!file) return
                const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
                if (!isPdf) {
                  alert('Please drop a PDF file.')
                  return
                }
                handlePdfUpload(file)
              }}
              className={`block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                formData.pdfFile
                  ? 'border-[#F5A3FF]/30 bg-[#F5A3FF]/5'
                  : isDraggingPdf
                  ? 'border-[#F5A3FF]/50 bg-[#F5A3FF]/5'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => e.target.files?.[0] && handlePdfUpload(e.target.files[0])}
              />
              {formData.pdfFile ? (
                <div>
                  <Check className="w-8 h-8 text-[#F5A3FF] mx-auto mb-2" />
                  <p className="text-sm text-zinc-300 font-mono">{formData.pdfFile.name}</p>
                  {uploadProgress < 100 && (
                    <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#F5A3FF] transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400 font-mono">
                    {isDraggingPdf ? 'Drop to upload PDF' : 'Drop PDF here or click to upload'}
                  </p>
                  <p className="text-xs text-zinc-700 mt-1">Max 50MB</p>
                </div>
              )}
            </label>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-xs text-zinc-700 font-mono">OR</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          {/* arXiv import */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Import from arXiv</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.arxivId}
                onChange={e => setFormData(f => ({ ...f, arxivId: e.target.value }))}
                placeholder="arXiv ID (e.g. 2301.07041)"
                className="flex-1 bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#F5A3FF]/30"
              />
              <Button variant="outline" size="sm" onClick={fetchArxiv} loading={arxivLoading}>
                Import
              </Button>
            </div>
            {arxivError && <p className="text-xs text-red-400 mt-1.5">{arxivError}</p>}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={goToStep2}>
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: Metadata */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Title *</label>
            <input
              required
              value={formData.title}
              onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30 font-mono"
              placeholder="Paper title"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-xs font-mono text-zinc-400">Abstract *</label>
              <span className="text-[11px] font-mono text-zinc-700">{formData.abstract.length}/2000</span>
            </div>
            <textarea
              required
              maxLength={2000}
              value={formData.abstract}
              onChange={e => setFormData(f => ({ ...f, abstract: e.target.value }))}
              rows={6}
              className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30 resize-none"
              placeholder="Paper abstract"
            />
          </div>

          {/* Authors */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-2">Authors *</label>
            <div className="space-y-2">
              {formData.authors.map((author, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <input
                    value={author.name}
                    onChange={e => {
                      const a = [...formData.authors]
                      a[i] = { ...a[i], name: e.target.value }
                      setFormData(f => ({ ...f, authors: a }))
                    }}
                    placeholder="Full name"
                    className="bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30"
                  />
                  <div className="flex gap-1">
                    <input
                      value={author.institution}
                      onChange={e => {
                        const a = [...formData.authors]
                        a[i] = { ...a[i], institution: e.target.value }
                        setFormData(f => ({ ...f, authors: a }))
                      }}
                      placeholder="Institution"
                      className="flex-1 bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30"
                    />
                    {formData.authors.length > 1 && (
                      <button
                        onClick={() => setFormData(f => ({ ...f, authors: f.authors.filter((_, j) => j !== i) }))}
                        className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setFormData(f => ({ ...f, authors: [...f.authors, { name: '', institution: '', email: '', orcid: '' }] }))}
              className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-mono"
            >
              <Plus className="w-3.5 h-3.5" /> Add author
            </button>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Field Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {formData.field_tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border border-[#F5A3FF]/30 text-[#F5A3FF] bg-[#F5A3FF]/5">
                  {tag}
                  <button onClick={() => setFormData(f => ({ ...f, field_tags: f.field_tags.filter(t => t !== tag) }))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagSearch}
              onChange={e => setTagSearch(e.target.value)}
              placeholder="Search tags..."
              className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#F5A3FF]/30 mb-2"
            />
            <div className="flex flex-wrap gap-1">
              {filteredTags.slice(0, 10).map(tag => (
                <button
                  key={tag}
                  onClick={() => setFormData(f => ({ ...f, field_tags: [...f.field_tags, tag] }))}
                  className="text-[11px] font-mono px-2 py-0.5 rounded border border-white/10 text-zinc-500 hover:border-[#F5A3FF]/30 hover:text-[#F5A3FF] transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              variant="primary"
              onClick={goToStep3}
              disabled={!formData.title || !formData.abstract}
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: AI Preview */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-[#111111] border border-white/8 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F5A3FF] animate-pulse" />
              <span className="text-xs font-mono text-zinc-400">AI-Generated Summary</span>
            </div>
            {aiError && (
              <div className="mb-3 text-xs text-amber-400 font-mono">
                AI preview issue: {aiError}
              </div>
            )}
            {tldrLoading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <Loader2 className="w-4 h-4 text-[#F5A3FF]" style={{ animation: 'spin 0.5s linear infinite' }} />
                <span className="font-mono">Generating your AI summary...</span>
              </div>
            ) : (
              <div>
                <textarea
                  value={formData.tldr}
                  onChange={e => setFormData(f => ({ ...f, tldr: e.target.value }))}
                  rows={3}
                  className="w-full bg-transparent text-sm text-zinc-300 focus:outline-none resize-none leading-relaxed"
                  placeholder="TL;DR will appear here..."
                />
                <p className="text-[10px] text-zinc-700 mt-2 font-mono">Edit before publishing if needed</p>
              </div>
            )}
          </div>

          {relatedPapers.length > 0 && (
            <div>
              <p className="text-xs font-mono text-zinc-600 mb-3">Related papers found</p>
              <div className="space-y-2">
                {relatedPapers.slice(0, 3).map(p => (
                  <PaperCard key={p.id} paper={p} compact />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button variant="primary" onClick={() => setStep(3)}>
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Submit */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Preview card */}
          <div>
            <p className="text-xs font-mono text-zinc-600 mb-3">Preview</p>
            <PaperCard
              href={null}
              paper={{
                id: 'preview',
                title: formData.title,
                abstract: formData.abstract,
                tldr: formData.tldr,
                authors: formData.authors,
                field_tags: formData.field_tags,
                status: 'under_review',
                view_count: 0,
                citation_count: 0,
                replication_score: 0,
                version: 1,
                submitter_id: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }}
            />
          </div>

          {submitError && (
            <div className="text-xs font-mono text-red-400 border border-red-500/20 bg-red-500/5 rounded px-3 py-2">
              {submitError}
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <div
              onClick={() => setAgreed(!agreed)}
              className={`w-4 h-4 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                agreed ? 'bg-[#F5A3FF] border-[#F5A3FF]' : 'border-white/20'
              }`}
            >
              {agreed && <Check className="w-3 h-3 text-black" />}
            </div>
            <span className="text-xs text-zinc-400">
              I confirm this is original work and I have the right to publish it.
            </span>
          </label>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!agreed}
              loading={submitting}
            >
              Submit Paper
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
