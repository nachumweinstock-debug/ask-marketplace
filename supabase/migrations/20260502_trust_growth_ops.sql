alter table users add column if not exists timezone text;
alter table users add column if not exists referral_code text;
alter table users add column if not exists referred_by uuid;
alter table users add column if not exists last_active_at timestamp with time zone;

alter table provider_profiles add column if not exists intro_video_url text;
alter table provider_profiles add column if not exists portfolio_notes text;
alter table provider_profiles add column if not exists school_verified boolean default false;

alter table reviews add column if not exists hidden boolean default false;

create table if not exists review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null,
  reporter_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamp with time zone default now()
);

create table if not exists provider_media (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null,
  media_type text not null,
  url text,
  title text,
  notes text,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists session_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  booking_id uuid not null,
  reminder_type text not null,
  dismissed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
