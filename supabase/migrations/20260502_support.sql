create table if not exists support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  user_email text null,
  status text default 'open',
  topic text null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references support_conversations(id) on delete cascade,
  sender_type text not null,
  sender_id uuid null,
  message text not null,
  created_at timestamp with time zone default now()
);

alter table support_conversations
  add constraint support_conversations_status_check
  check (status in ('open', 'bot_answered', 'needs_admin', 'closed'));

alter table support_messages
  add constraint support_messages_sender_type_check
  check (sender_type in ('user', 'bot', 'admin'));

create index if not exists support_conversations_updated_at_idx
  on support_conversations (updated_at desc);

create index if not exists support_messages_conversation_id_created_at_idx
  on support_messages (conversation_id, created_at);
