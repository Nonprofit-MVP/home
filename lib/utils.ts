import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import type { Author, PaperStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAuthors(authors: Author[]): string {
  if (!authors || authors.length === 0) return 'Unknown'
  if (authors.length === 1) return authors[0].name
  if (authors.length === 2) return `${authors[0].name} & ${authors[1].name}`
  return `${authors[0].name} et al.`
}

function parseUTC(dateStr: string): Date {
  // Ensure the string is treated as UTC so server and client produce the same output
  if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
    return new Date(dateStr + 'Z')
  }
  return new Date(dateStr)
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseUTC(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function formatRelativeDate(dateStr: string): string {
  try {
    return formatDistanceToNow(parseUTC(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

export function generateDOI(): string {
  const date = format(new Date(), 'yyyyMMdd')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let random = ''
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `10.99999/${date}-${random}`
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export const STATUS_CONFIG: Record<PaperStatus, { label: string; color: string }> = {
  draft: { label: 'DRAFT', color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20' },
  under_review: { label: 'UNDER REVIEW', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  reviewed: { label: 'REVIEWED', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  peer_verified: { label: 'PEER VERIFIED', color: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
}

export const FIELD_TAGS = [
  'agriculture',
  'alignment',
  'anthropology',
  'astronomy',
  'biology',
  'biomedical-engineering',
  'business',
  'chemistry',
  'cognitive-science',
  'climate-science',
  'computational-biology',
  'computer-science',
  'interpretability',
  'nlp',
  'computer-vision',
  'cybersecurity',
  'data-science',
  'databases',
  'decision-science',
  'design',
  'earth-science',
  'economics',
  'education',
  'electrical-engineering',
  'energy',
  'engineering',
  'reinforcement-learning',
  'llm-reasoning',
  'ai-safety',
  'multimodal',
  'efficient-inference',
  'epidemiology',
  'ethics',
  'formal-verification',
  'finance',
  'formal-methods',
  'game-theory',
  'robotics',
  'generative-models',
  'federated-learning',
  'graph-neural-networks',
  'health',
  'history',
  'hci',
  'knowledge-graphs',
  'law',
  'linguistics',
  'materials-science',
  'mathematics',
  'mechanical-engineering',
  'medicine',
  'meta-science',
  'microbiology',
  'ml-engineering',
  'networking',
  'neuroscience',
  'operations-research',
  'philosophy',
  'physics',
  'political-science',
  'psychology',
  'public-policy',
  'security',
  'signal-processing',
  'social-science',
  'sociology',
  'statistics',
  'systems',
  'theory',
  'transportation',
  'ux',
]

export type ArticleLocale = 'canada-english' | 'canada-french'

export const ARTICLE_EDITIONS: { value: ArticleLocale; label: string }[] = [
  { value: 'canada-english', label: 'Canada (English)' },
  { value: 'canada-french', label: 'Canada (French)' },
]

export const ARTICLE_TAGS = [
  'physics',
  'chemistry',
  'astronomy',
  'computer-science',
  'mathematics',
  'biology',
  'materials-science',
  'earth-science',
] as const

export function formatArticleTag(tag: string): string {
  return tag.replace(/-/g, ' ')
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

export function isValidOrcid(orcid: string): boolean {
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid)
}

export function isValidInstitutionalEmail(email: string): boolean {
  const academicDomains = ['.edu', '.ac.uk', '.ac.jp', '.uni-', '.university', 'research', 'institute', 'lab']
  return academicDomains.some(d => email.toLowerCase().includes(d))
}
