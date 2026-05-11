-- Study Hangouts: real-time "who's studying now" board for YU students

create table if not exists study_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,
  subject        text not null,
  location       text not null,
  class_code     text,
  expires_at     timestamp with time zone not null default (now() + interval '2 hours'),
  attendee_count integer not null default 1,
  created_at     timestamp with time zone default now()
);

create table if not exists session_attendees (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references study_sessions(id) on delete cascade,
  user_id    uuid not null,
  joined_at  timestamp with time zone default now(),
  unique(session_id, user_id)
);

create index if not exists idx_study_sessions_expires_at
  on study_sessions(expires_at);

create index if not exists idx_session_attendees_session_id
  on session_attendees(session_id);

create index if not exists idx_session_attendees_user_id
  on session_attendees(user_id);
