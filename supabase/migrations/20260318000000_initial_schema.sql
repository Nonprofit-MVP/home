-- ============================================================
-- Journality — Initial Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
-- ============================================================
-- USERS
-- ============================================================
create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,
  full_name    text not null,
  institution  text not null default '',
  orcid        text,
  role         text not null default 'reader' check (role in ('reader', 'researcher', 'editor', 'admin')),
  avatar_url   text,
  bio          text,
  created_at   timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view all profiles"
  on public.users for select using (true);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert with check (auth.uid() = id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- PAPERS
-- ============================================================
create table if not exists public.papers (
  id                uuid primary key default uuid_generate_v4(),
  title             text not null,
  abstract          text not null,
  tldr              text,
  authors           jsonb not null default '[]',
  submitter_id      uuid not null references public.users(id) on delete cascade,
  status            text not null default 'draft' check (status in ('draft', 'under_review', 'reviewed', 'peer_verified')),
  field_tags        text[] not null default '{}',
  doi               text,
  pdf_url           text,
  source_url        text,
  view_count        integer not null default 0,
  citation_count    integer not null default 0,
  replication_score integer not null default 0,
  version           integer not null default 1,
  created_at        timestamptz not null default now(),
  published_at      timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists papers_submitter_id_idx on public.papers(submitter_id);
create index if not exists papers_status_idx on public.papers(status);
create index if not exists papers_created_at_idx on public.papers(created_at desc);
create index if not exists papers_field_tags_idx on public.papers using gin(field_tags);

alter table public.papers enable row level security;

create policy "Anyone can view non-draft papers"
  on public.papers for select using (status != 'draft' or auth.uid() = submitter_id);

create policy "Authenticated users can create papers"
  on public.papers for insert with check (auth.uid() = submitter_id);

create policy "Submitters and editors can update papers"
  on public.papers for update using (
    auth.uid() = submitter_id
    or exists (select 1 from public.users where id = auth.uid() and role in ('editor', 'admin'))
  );

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists papers_updated_at on public.papers;
create trigger papers_updated_at
  before update on public.papers
  for each row execute function public.update_updated_at();

-- ============================================================
-- PAPER VERSIONS
-- ============================================================
create table if not exists public.paper_versions (
  id              uuid primary key default uuid_generate_v4(),
  paper_id        uuid not null references public.papers(id) on delete cascade,
  version_number  integer not null,
  content_diff    text,
  change_summary  text not null,
  changed_by      uuid not null references public.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (paper_id, version_number)
);

create index if not exists paper_versions_paper_id_idx on public.paper_versions(paper_id);

alter table public.paper_versions enable row level security;

create policy "Anyone can view paper versions"
  on public.paper_versions for select using (true);

create policy "Authenticated users can insert paper versions"
  on public.paper_versions for insert with check (auth.uid() = changed_by);

-- ============================================================
-- REVIEWS
-- ============================================================
create table if not exists public.reviews (
  id                  uuid primary key default uuid_generate_v4(),
  paper_id            uuid not null references public.papers(id) on delete cascade,
  reviewer_id         uuid not null references public.users(id) on delete cascade,
  round               integer not null default 1,
  significance_score  integer check (significance_score between 1 and 10),
  methodology_score   integer check (methodology_score between 1 and 10),
  clarity_score       integer check (clarity_score between 1 and 10),
  recommendation      text check (recommendation in ('accept', 'minor_revision', 'major_revision', 'reject')),
  comments            text,
  is_public           boolean not null default true,
  is_anonymous        boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists reviews_paper_id_idx on public.reviews(paper_id);
create index if not exists reviews_reviewer_id_idx on public.reviews(reviewer_id);

alter table public.reviews enable row level security;

create policy "Anyone can view public reviews"
  on public.reviews for select using (is_public = true or auth.uid() = reviewer_id);

create policy "Researchers and above can create reviews"
  on public.reviews for insert with check (
    auth.uid() = reviewer_id
    and exists (select 1 from public.users where id = auth.uid() and role in ('researcher', 'editor', 'admin'))
  );

create policy "Reviewers can update own reviews"
  on public.reviews for update using (auth.uid() = reviewer_id);

-- ============================================================
-- REPLICATION ATTEMPTS
-- ============================================================
create table if not exists public.replication_attempts (
  id                    uuid primary key default uuid_generate_v4(),
  paper_id              uuid not null references public.papers(id) on delete cascade,
  researcher_id         uuid not null references public.users(id) on delete cascade,
  institution           text not null,
  outcome               text not null check (outcome in ('replicated', 'partial', 'failed')),
  notes                 text,
  replication_paper_url text,
  created_at            timestamptz not null default now()
);

create index if not exists replication_attempts_paper_id_idx on public.replication_attempts(paper_id);

alter table public.replication_attempts enable row level security;

create policy "Anyone can view replication attempts"
  on public.replication_attempts for select using (true);

create policy "Researchers can create replication attempts"
  on public.replication_attempts for insert with check (
    auth.uid() = researcher_id
    and exists (select 1 from public.users where id = auth.uid() and role in ('researcher', 'editor', 'admin'))
  );

-- Update paper replication_score on insert/delete
create or replace function public.update_replication_score()
returns trigger language plpgsql security definer as $$
begin
  update public.papers set
    replication_score = (
      select count(*) filter (where outcome = 'replicated') * 100 /
             greatest(count(*), 1)
      from public.replication_attempts
      where paper_id = coalesce(new.paper_id, old.paper_id)
    )
  where id = coalesce(new.paper_id, old.paper_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists replication_score_update on public.replication_attempts;
create trigger replication_score_update
  after insert or delete on public.replication_attempts
  for each row execute function public.update_replication_score();

-- ============================================================
-- EDIT REQUESTS
-- ============================================================
create table if not exists public.edit_requests (
  id                uuid primary key default uuid_generate_v4(),
  paper_id          uuid not null references public.papers(id) on delete cascade,
  requester_id      uuid not null references public.users(id) on delete cascade,
  proposed_changes  text not null,
  status            text not null default 'open' check (status in ('open', 'approved', 'rejected', 'merged')),
  reviewer_comment  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists edit_requests_paper_id_idx on public.edit_requests(paper_id);
create index if not exists edit_requests_requester_id_idx on public.edit_requests(requester_id);

alter table public.edit_requests enable row level security;

create policy "Anyone can view edit requests"
  on public.edit_requests for select using (true);

create policy "Authenticated users can create edit requests"
  on public.edit_requests for insert with check (auth.uid() = requester_id);

create policy "Editors and admins can update edit requests"
  on public.edit_requests for update using (
    exists (select 1 from public.users where id = auth.uid() and role in ('editor', 'admin'))
    or auth.uid() = requester_id
  );

drop trigger if exists edit_requests_updated_at on public.edit_requests;
create trigger edit_requests_updated_at
  before update on public.edit_requests
  for each row execute function public.update_updated_at();

-- ============================================================
-- BOOKMARKS
-- ============================================================
create table if not exists public.bookmarks (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  paper_id   uuid not null references public.papers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, paper_id)
);

create index if not exists bookmarks_user_id_idx on public.bookmarks(user_id);

alter table public.bookmarks enable row level security;

create policy "Users can view own bookmarks"
  on public.bookmarks for select using (auth.uid() = user_id);

create policy "Users can manage own bookmarks"
  on public.bookmarks for insert with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on public.bookmarks for delete using (auth.uid() = user_id);

-- ============================================================
-- FOLLOWS
-- ============================================================
create table if not exists public.follows (
  follower_id  uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

create index if not exists follows_follower_id_idx on public.follows(follower_id);
create index if not exists follows_following_id_idx on public.follows(following_id);

alter table public.follows enable row level security;

create policy "Anyone can view follows"
  on public.follows for select using (true);

create policy "Users can manage own follows"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "Users can delete own follows"
  on public.follows for delete using (auth.uid() = follower_id);

-- ============================================================
-- SEED: Sample data (optional, safe to remove)
-- ============================================================
-- Insert a test paper for the anon/demo view (no auth required):
-- (Uncomment if you want demo data)
--
-- insert into public.users (id, username, full_name, institution, role)
-- values ('00000000-0000-0000-0000-000000000001', 'demo_user', 'Demo Researcher', 'MIT', 'researcher');
--
-- insert into public.papers (title, abstract, submitter_id, status, field_tags)
-- values (
--   'Sample Paper: AI Safety in 2026',
--   'This paper explores key challenges in AI safety...',
--   '00000000-0000-0000-0000-000000000001',
--   'peer_verified',
--   array['AI/ML', 'Computer Science']
-- );
