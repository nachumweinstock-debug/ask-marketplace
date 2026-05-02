create table if not exists saved_tutors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tutor_id uuid not null,
  created_at timestamp with time zone default now(),
  unique(user_id, tutor_id)
);

create index if not exists idx_saved_tutors_user_id
  on saved_tutors(user_id);

create index if not exists idx_saved_tutors_tutor_id
  on saved_tutors(tutor_id);
