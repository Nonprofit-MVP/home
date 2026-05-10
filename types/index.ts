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

export interface PaperFeedItem extends Paper {
  isBookmarked?: boolean;
}
