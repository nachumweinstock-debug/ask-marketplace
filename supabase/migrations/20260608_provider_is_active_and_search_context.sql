alter table if exists public.provider_profiles
  add column if not exists is_active boolean default true;

update public.provider_profiles
set is_active = true
where is_active is null;
