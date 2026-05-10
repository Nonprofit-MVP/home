export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          full_name: string
          institution: string
          orcid: string | null
          role: 'reader' | 'researcher' | 'editor' | 'admin'
          avatar_url: string | null
          bio: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          full_name: string
          institution?: string
          orcid?: string | null
          role?: 'reader' | 'researcher' | 'editor' | 'admin'
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          institution?: string
          orcid?: string | null
          role?: 'reader' | 'researcher' | 'editor' | 'admin'
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
        }
      }
      papers: {
        Row: {
          id: string
          title: string
          abstract: string
          tldr: string | null
          authors: Json
          submitter_id: string
          status: 'draft' | 'under_review' | 'reviewed' | 'peer_verified'
          field_tags: string[]
          doi: string | null
          pdf_url: string | null
          source_url: string | null
          view_count: number
          citation_count: number
          replication_score: number
          version: number
          created_at: string
          published_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          abstract: string
          tldr?: string | null
          authors?: Json
          submitter_id: string
          status?: 'draft' | 'under_review' | 'reviewed' | 'peer_verified'
          field_tags?: string[]
          doi?: string | null
          pdf_url?: string | null
          source_url?: string | null
          view_count?: number
          citation_count?: number
          replication_score?: number
          version?: number
          created_at?: string
          published_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          abstract?: string
          tldr?: string | null
          authors?: Json
          submitter_id?: string
          status?: 'draft' | 'under_review' | 'reviewed' | 'peer_verified'
          field_tags?: string[]
          doi?: string | null
          pdf_url?: string | null
          source_url?: string | null
          view_count?: number
          citation_count?: number
          replication_score?: number
          version?: number
          created_at?: string
          published_at?: string | null
          updated_at?: string
        }
      }
      paper_versions: {
        Row: {
          id: string
          paper_id: string
          version_number: number
          content_diff: string | null
          change_summary: string
          changed_by: string
          created_at: string
        }
        Insert: {
          id?: string
          paper_id: string
          version_number: number
          content_diff?: string | null
          change_summary: string
          changed_by: string
          created_at?: string
        }
        Update: {
          id?: string
          paper_id?: string
          version_number?: number
          content_diff?: string | null
          change_summary?: string
          changed_by?: string
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          paper_id: string
          reviewer_id: string
          round: number
          significance_score: number | null
          methodology_score: number | null
          clarity_score: number | null
          recommendation: 'accept' | 'minor_revision' | 'major_revision' | 'reject' | null
          comments: string | null
          is_public: boolean
          is_anonymous: boolean
          created_at: string
        }
        Insert: {
          id?: string
          paper_id: string
          reviewer_id: string
          round?: number
          significance_score?: number | null
          methodology_score?: number | null
          clarity_score?: number | null
          recommendation?: 'accept' | 'minor_revision' | 'major_revision' | 'reject' | null
          comments?: string | null
          is_public?: boolean
          is_anonymous?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          paper_id?: string
          reviewer_id?: string
          round?: number
          significance_score?: number | null
          methodology_score?: number | null
          clarity_score?: number | null
          recommendation?: 'accept' | 'minor_revision' | 'major_revision' | 'reject' | null
          comments?: string | null
          is_public?: boolean
          is_anonymous?: boolean
          created_at?: string
        }
      }
      replication_attempts: {
        Row: {
          id: string
          paper_id: string
          researcher_id: string
          institution: string
          outcome: 'replicated' | 'partial' | 'failed'
          notes: string | null
          replication_paper_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          paper_id: string
          researcher_id: string
          institution: string
          outcome: 'replicated' | 'partial' | 'failed'
          notes?: string | null
          replication_paper_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          paper_id?: string
          researcher_id?: string
          institution?: string
          outcome?: 'replicated' | 'partial' | 'failed'
          notes?: string | null
          replication_paper_url?: string | null
          created_at?: string
        }
      }
      edit_requests: {
        Row: {
          id: string
          paper_id: string
          requester_id: string
          proposed_changes: string
          status: 'open' | 'approved' | 'rejected' | 'merged'
          reviewer_comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          paper_id: string
          requester_id: string
          proposed_changes: string
          status?: 'open' | 'approved' | 'rejected' | 'merged'
          reviewer_comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          paper_id?: string
          requester_id?: string
          proposed_changes?: string
          status?: 'open' | 'approved' | 'rejected' | 'merged'
          reviewer_comment?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          paper_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          paper_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          paper_id?: string
          created_at?: string
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
        }
        Insert: {
          follower_id: string
          following_id: string
        }
        Update: {
          follower_id?: string
          following_id?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
