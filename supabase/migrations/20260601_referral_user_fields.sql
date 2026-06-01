create extension if not exists pgcrypto;

create or replace function public.generate_ask_referral_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  exists_code boolean;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
    end loop;

    select exists(select 1 from public.users where upper(referral_code) = code) into exists_code;
    exit when not exists_code;
  end loop;

  return code;
end;
$$;

alter table public.users
  add column if not exists referral_code text,
  add column if not exists referred_by uuid;

update public.users
set referral_code = public.generate_ask_referral_code()
where referral_code is null or length(trim(referral_code)) = 0;

update public.users
set referral_code = upper(referral_code)
where referral_code is not null;

with duplicate_codes as (
  select id,
    row_number() over (
      partition by referral_code
      order by created_at nulls last, id
    ) as row_number
  from public.users
  where referral_code is not null
)
update public.users u
set referral_code = public.generate_ask_referral_code()
from duplicate_codes d
where u.id = d.id and d.row_number > 1;

alter table public.users
  alter column referral_code set not null;

create unique index if not exists users_referral_code_key
  on public.users(referral_code);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_referred_by_fkey'
  ) then
    alter table public.users
      add constraint users_referred_by_fkey
      foreign key (referred_by)
      references public.users(id)
      on delete set null;
  end if;
end;
$$;

create or replace function public.set_ask_referral_code()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null or length(trim(new.referral_code)) = 0 then
    new.referral_code := public.generate_ask_referral_code();
  end if;
  new.referral_code := upper(new.referral_code);
  return new;
end;
$$;

drop trigger if exists set_ask_referral_code_on_users on public.users;

create trigger set_ask_referral_code_on_users
before insert on public.users
for each row
execute function public.set_ask_referral_code();
