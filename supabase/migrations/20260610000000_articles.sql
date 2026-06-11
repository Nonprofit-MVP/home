-- ============================================================
-- ARTICLES (syndicated / editorial content — separate from papers)
-- ============================================================

create table if not exists public.articles (
  id              uuid primary key default uuid_generate_v4(),
  external_id     text not null unique,
  title           text not null,
  excerpt         text not null,
  body            text not null,
  authors         jsonb not null default '[]',
  source_name     text not null default 'The Conversation',
  source_url      text not null,
  cover_image_url text,
  field_tags      text[] not null default '{}',
  view_count      integer not null default 0,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists articles_published_at_idx on public.articles(published_at desc);
create index if not exists articles_created_at_idx on public.articles(created_at desc);
create index if not exists articles_field_tags_idx on public.articles using gin(field_tags);
create index if not exists articles_view_count_idx on public.articles(view_count desc);

alter table public.articles enable row level security;

create policy "Anyone can view articles"
  on public.articles for select using (true);

drop trigger if exists articles_updated_at on public.articles;
create trigger articles_updated_at
  before update on public.articles
  for each row execute function public.update_updated_at();
