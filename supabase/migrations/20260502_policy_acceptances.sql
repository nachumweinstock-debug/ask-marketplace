create table if not exists policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamp with time zone default now(),
  ip_address text,
  user_agent text
);

create index if not exists idx_policy_acceptances_user_id
  on policy_acceptances(user_id);
