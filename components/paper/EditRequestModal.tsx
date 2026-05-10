'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface EditRequestModalProps {
  isOpen: boolean
  onClose: () => void
  paperId: string
  paperTitle: string
}

export function EditRequestModal({ isOpen, onClose, paperId, paperTitle }: EditRequestModalProps) {
  const [proposedChanges, setProposedChanges] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proposedChanges.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/edit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper_id: paperId, proposed_changes: proposedChanges }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setProposedChanges('')
    setError('')
    setSuccess(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request Edit" size="md">
      {success ? (
        <div className="p-8 text-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-[#F5A3FF] text-lg">✓</span>
          </div>
          <p className="text-sm text-zinc-300 font-mono mb-1">Request submitted</p>
          <p className="text-xs text-zinc-600">The paper author will review your proposed changes.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleClose}>Close</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-zinc-500 font-mono truncate">
            Requesting edit for: <span className="text-zinc-300">{paperTitle}</span>
          </p>
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Proposed Changes</label>
            <textarea
              required
              value={proposedChanges}
              onChange={e => setProposedChanges(e.target.value)}
              rows={6}
              className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-[#F5A3FF]/30 resize-none"
              placeholder="Describe the changes you'd like to propose, including specific sections, corrections, or additions..."
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" type="button" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={loading}>
              Submit Request
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
