-- ============================================================
-- AI RESEARCH AGENT — persistent conversations & messages
-- ============================================================

create table if not exists public.agent_conversations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null default 'New conversation',
  context     jsonb not null default '{}',
  provider    text,
  model       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists agent_conversations_user_idx
  on public.agent_conversations(user_id, updated_at desc);

alter table public.agent_conversations enable row level security;

create policy "Users can view own agent conversations"
  on public.agent_conversations for select using (auth.uid() = user_id);

create policy "Users can create own agent conversations"
  on public.agent_conversations for insert with check (auth.uid() = user_id);

create policy "Users can update own agent conversations"
  on public.agent_conversations for update using (auth.uid() = user_id);

create policy "Users can delete own agent conversations"
  on public.agent_conversations for delete using (auth.uid() = user_id);

drop trigger if exists agent_conversations_updated_at on public.agent_conversations;
create trigger agent_conversations_updated_at
  before update on public.agent_conversations
  for each row execute function public.update_updated_at();

create table if not exists public.agent_messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references public.agent_conversations(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null default '',
  tool_calls       jsonb not null default '[]',
  sources          jsonb not null default '[]',
  provider         text,
  model            text,
  created_at       timestamptz not null default now()
);

create index if not exists agent_messages_conversation_idx
  on public.agent_messages(conversation_id, created_at);

alter table public.agent_messages enable row level security;

create policy "Users can view messages in own conversations"
  on public.agent_messages for select using (
    exists (
      select 1 from public.agent_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own conversations"
  on public.agent_messages for insert with check (
    exists (
      select 1 from public.agent_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users can delete messages in own conversations"
  on public.agent_messages for delete using (
    exists (
      select 1 from public.agent_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
