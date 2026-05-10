'use client'

import { useState } from 'react'
import { ExternalLink, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn, formatDate } from '@/lib/utils'
import type { ReplicationAttempt, ReplicationOutcome } from '@/types'

interface ReplicationLedgerProps {
  attempts: ReplicationAttempt[]
  paperId: string
  isLoggedIn: boolean
}

const OUTCOME_CONFIG: Record<ReplicationOutcome, { label: string; color: string }> = {
  replicated: { label: 'Replicated', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  partial: { label: 'Partial', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  failed: { label: 'Failed', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
}

function SubmitReplicationModal({
  isOpen,
  onClose,
  paperId,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  paperId: string
  onSuccess: (attempt: ReplicationAttempt) => void
}) {
  const [form, setForm] = useState({
    institution: '',
    outcome: 'replicated' as ReplicationOutcome,
    notes: '',
    replication_paper_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/replications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, paper_id: paperId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onSuccess(data)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Replication" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5">Institution</label>
          <input
            required
            value={form.institution}
            onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
            className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30"
            placeholder="Your institution"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5">Outcome</label>
          <select
            value={form.outcome}
            onChange={e => setForm(f => ({ ...f, outcome: e.target.value as ReplicationOutcome }))}
            className="w-full bg-[#111111] border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30"
          >
            <option value="replicated">Replicated</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30 resize-none"
            placeholder="Describe your replication attempt..."
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5">Replication Paper URL (optional)</label>
          <input
            type="url"
            value={form.replication_paper_url}
            onChange={e => setForm(f => ({ ...f, replication_paper_url: e.target.value }))}
            className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30"
            placeholder="https://..."
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" loading={loading}>Submit</Button>
        </div>
      </form>
    </Modal>
  )
}

export function ReplicationLedger({ attempts, paperId, isLoggedIn }: ReplicationLedgerProps) {
  const [localAttempts, setLocalAttempts] = useState(attempts)
  const [modalOpen, setModalOpen] = useState(false)

  const successful = localAttempts.filter(a => a.outcome === 'replicated').length
  const total = localAttempts.length

  return (
    <div>
      {/* Summary + Button */}
      <div className="flex items-center justify-between mb-4">
        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-zinc-200">
              <span className="text-[#F5A3FF]">{successful}</span>/{total}
            </span>
            <span className="text-xs text-zinc-600">replications successful</span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!isLoggedIn) {
              window.location.href = '/auth/login'
              return
            }
            setModalOpen(true)
          }}
          className="ml-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Submit Replication
        </Button>
      </div>

      {localAttempts.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">
          <p className="font-mono text-sm">No replication attempts yet</p>
          <p className="text-xs mt-1">Be the first to replicate this research</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Researcher', 'Institution', 'Outcome', 'Date', 'Link'].map(h => (
                  <th key={h} className="text-left pb-3 text-[11px] font-mono text-zinc-600 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localAttempts.map(attempt => {
                const config = OUTCOME_CONFIG[attempt.outcome]
                return (
                  <tr key={attempt.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pr-4 text-xs text-zinc-300 font-mono">
                      {attempt.researcher?.full_name || 'Anonymous'}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-zinc-500">{attempt.institution}</td>
                    <td className="py-2.5 pr-4">
                      <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded-full border', config.color)}>
                        {config.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-zinc-600 font-mono">
                      {formatDate(attempt.created_at)}
                    </td>
                    <td className="py-2.5">
                      {attempt.replication_paper_url ? (
                        <a
                          href={attempt.replication_paper_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#F5A3FF] hover:text-[#EB67FF] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <SubmitReplicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        paperId={paperId}
        onSuccess={(attempt) => setLocalAttempts(prev => [...prev, attempt])}
      />
    </div>
  )
}
