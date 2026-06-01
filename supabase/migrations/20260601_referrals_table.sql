create extension if not exists pgcrypto;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referred_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  redeemed boolean not null default false,
  unique(referred_id)
);

create index if not exists referrals_referrer_id_idx
  on public.referrals(referrer_id);

create index if not exists referrals_redeemed_idx
  on public.referrals(redeemed);
