'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Trash2, Pencil, FileText, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import type { AgentConversation } from '@/types'

interface ConversationListProps {
  conversations: AgentConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AgentConversation | null>(null)

  const commitRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 shrink-0">
        <Button variant="primary" size="sm" className="w-full" onClick={onNew}>
          <Plus className="w-3.5 h-3.5" />
          New research chat
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 space-y-0.5">
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-[11px] font-mono text-zinc-700 text-center">
            No conversations yet
          </p>
        )}
        {conversations.map(convo => (
          <div
            key={convo.id}
            className={cn(
              'group relative rounded-lg transition-colors',
              activeId === convo.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
            )}
          >
            {editingId === convo.id ? (
              <div className="flex items-center gap-1 px-2 py-2">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 min-w-0 bg-white/5 border border-[#F5A3FF]/30 rounded px-1.5 py-1 text-xs text-zinc-200 focus:outline-none"
                />
                <button onClick={commitRename} className="p-1 text-zinc-500 hover:text-[#F5A3FF]">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1 text-zinc-500 hover:text-zinc-300">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => onSelect(convo.id)} className="w-full text-left px-2.5 py-2">
                  <span className="flex items-center gap-1.5">
                    {convo.context?.type === 'paper' && (
                      <FileText className="w-3 h-3 text-[#F5A3FF]/70 shrink-0" />
                    )}
                    <span
                      className={cn(
                        'text-xs truncate',
                        activeId === convo.id ? 'text-zinc-200' : 'text-zinc-400'
                      )}
                    >
                      {convo.title}
                    </span>
                  </span>
                  <span className="block text-[10px] font-mono text-zinc-700 mt-0.5">
                    {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: true })}
                  </span>
                </button>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-[#141414] rounded">
                  <button
                    onClick={() => {
                      setEditingId(convo.id)
                      setEditTitle(convo.title)
                    }}
                    className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
                    title="Rename"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(convo)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete conversation"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-400">
            Delete <span className="text-zinc-200">“{deleteTarget?.title}”</span> and all its
            messages? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
