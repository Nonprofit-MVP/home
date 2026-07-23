export type UserRole = 'reader' | 'researcher' | 'editor' | 'admin';

export interface User {
  id: string;
  username: string;
  full_name: string;
  institution: string;
  orcid?: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  created_at: string;
}

export type PaperStatus = 'draft' | 'under_review' | 'reviewed' | 'peer_verified';

export interface Author {
  name: string;
  institution: string;
  email: string;
  orcid?: string;
}

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  tldr?: string;
  authors: Author[];
  submitter_id: string;
  status: PaperStatus;
  field_tags: string[];
  doi?: string;
  pdf_url?: string;
  source_url?: string;
  view_count: number;
  citation_count: number;
  replication_score: number;
  version: number;
  created_at: string;
  published_at?: string;
  updated_at: string;
  // joined data
  submitter?: User;
}

export interface PaperVersion {
  id: string;
  paper_id: string;
  version_number: number;
  content_diff?: string;
  change_summary: string;
  changed_by: string;
  created_at: string;
  // joined
  changer?: User;
}

export type ReviewRecommendation = 'accept' | 'minor_revision' | 'major_revision' | 'reject';

export interface Review {
  id: string;
  paper_id: string;
  reviewer_id: string;
  round: number;
  significance_score?: number;
  methodology_score?: number;
  clarity_score?: number;
  recommendation?: ReviewRecommendation;
  comments?: string;
  is_public: boolean;
  is_anonymous: boolean;
  created_at: string;
  // joined
  reviewer?: User;
}

export type ReplicationOutcome = 'replicated' | 'partial' | 'failed';

export interface ReplicationAttempt {
  id: string;
  paper_id: string;
  researcher_id: string;
  institution: string;
  outcome: ReplicationOutcome;
  notes?: string;
  replication_paper_url?: string;
  created_at: string;
  // joined
  researcher?: User;
}

export type EditRequestStatus = 'open' | 'approved' | 'rejected' | 'merged';

export interface EditRequest {
  id: string;
  paper_id: string;
  requester_id: string;
  proposed_changes: string;
  status: EditRequestStatus;
  reviewer_comment?: string;
  created_at: string;
  updated_at: string;
  // joined
  paper?: Paper;
  requester?: User;
}

export interface Bookmark {
  id: string;
  user_id: string;
  paper_id: string;
  created_at: string;
  paper?: Paper;
}

export interface Follow {
  follower_id: string;
  following_id: string;
}

// API Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// AI Research Agent
export interface AgentSource {
  title: string;
  url?: string;
  doi?: string;
  year?: number | string | null;
  venue?: string | null;
  authors?: string[];
}

export interface ToolTraceEntry {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  ms: number;
}

export interface AgentToolEvent {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  status: 'running' | 'done';
  ok?: boolean;
  ms?: number;
}

export interface AgentConversation {
  id: string;
  title: string;
  context: { type?: 'paper'; paper_id?: string };
  provider?: string | null;
  model?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: ToolTraceEntry[];
  sources?: AgentSource[];
  provider?: string | null;
  model?: string | null;
  created_at: string;
}

export type AgentStreamEvent =
  | { type: 'meta'; conversationId: string; provider: string; model: string }
  | { type: 'token'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'reset' }
  | { type: 'tool'; id: string; name: string; args?: Record<string, unknown>; status: 'running' | 'done'; ok?: boolean; ms?: number }
  | { type: 'sources'; sources: AgentSource[] }
  | { type: 'done'; ok: boolean; messageId?: string | null; stopReason?: string }
  | { type: 'error'; message: string };

export interface PaperFeedItem extends Paper {
  isBookmarked?: boolean;
}

export interface Article {
  id: string;
  external_id?: string;
  title: string;
  excerpt: string;
  /** Full HTML — only loaded on the article detail page, not feed cards. */
  body?: string;
  authors: Author[];
  source_name: string;
  source_url: string;
  cover_image_url?: string;
  field_tags: string[];
  view_count: number;
  published_at?: string;
  created_at: string;
  updated_at?: string;
}
