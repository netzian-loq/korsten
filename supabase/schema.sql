-- Realtor Suite — client roster.
-- Run this in the Supabase SQL editor, then set NEXT_PUBLIC_SUPABASE_URL and
-- NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. Until you do, the dashboard
-- runs on the seed roster in lib/clients.ts and says so in the header.

create table if not exists public.clients (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  phone               text,
  email               text,
  budget_min          integer not null default 0,
  budget_max          integer not null default 0,
  preferred_locations text[]  not null default '{}',
  house_styles        text[]  not null default '{}',
  status              text    not null default 'Lead',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint clients_status_valid
    check (status in ('Lead', 'Viewing', 'Under Contract')),
  constraint clients_budget_ordered
    check (budget_max >= budget_min)
);

-- The dashboard filters by status and sorts by name.
create index if not exists clients_status_idx on public.clients (status);
create index if not exists clients_full_name_idx on public.clients (full_name);

-- Keep updated_at honest on every write.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

-- ⚠ Development policy only. This lets anyone holding the anon key read and
-- edit every client, which is fine for a local scaffold and wrong for
-- production. Once you add Supabase Auth, replace both policies with
-- ownership-scoped ones — e.g. add an `agent_id uuid references auth.users`
-- column and check `auth.uid() = agent_id`.
drop policy if exists "clients are readable in development" on public.clients;
create policy "clients are readable in development"
  on public.clients for select
  using (true);

drop policy if exists "clients are editable in development" on public.clients;
create policy "clients are editable in development"
  on public.clients for update
  using (true) with check (true);

-- Seed roster, matching lib/clients.ts so local and remote start identical.
insert into public.clients
  (id, full_name, phone, email, budget_min, budget_max,
   preferred_locations, house_styles, status)
values
  ('c1f4a2b0-0000-4000-8000-000000000001', 'Ada Okonkwo',       '(971) 555-0188', 'ada.okonkwo@example.com',     540000,  680000, '{"Sellwood","Woodstock"}',             '{"Ranch","Mid-century"}',     'Viewing'),
  ('c1f4a2b0-0000-4000-8000-000000000002', 'Dana Whitfield',    '(503) 555-0119', 'd.whitfield@example.com',    1200000, 1600000, '{"Irvington","Laurelhurst"}',          '{"Colonial","Tudor"}',        'Viewing'),
  ('c1f4a2b0-0000-4000-8000-000000000003', 'Gwen Achterberg',   '(503) 555-0131', 'gwen.a@example.com',          900000, 1100000, '{"Eastmoreland","Reed"}',              '{"Tudor","Colonial"}',        'Viewing'),
  ('c1f4a2b0-0000-4000-8000-000000000004', 'Marisol Reyes',     '(503) 555-0142', 'marisol.reyes@example.com',   780000,  950000, '{"Alberta","Concordia"}',              '{"Craftsman","Bungalow"}',    'Under Contract'),
  ('c1f4a2b0-0000-4000-8000-000000000005', 'Priya Raghunathan', '(503) 555-0173', 'priya.r@example.com',         425000,  525000, '{"St. Johns","Kenton"}',               '{"Bungalow","Foursquare"}',   'Lead'),
  ('c1f4a2b0-0000-4000-8000-000000000006', 'Renata Alvarez',    '(503) 555-0166', 'renata.alvarez@example.com',  615000,  740000, '{"Buckman","Hosford-Abernethy"}',      '{"Victorian","Foursquare"}',  'Under Contract'),
  ('c1f4a2b0-0000-4000-8000-000000000007', 'Samuel Ortiz',      '(971) 555-0157', 'sam.ortiz@example.com',       350000,  460000, '{"Lents","Montavilla"}',               '{"Ranch","Split-level"}',     'Lead'),
  ('c1f4a2b0-0000-4000-8000-000000000008', 'Tobias Lindqvist',  '(971) 555-0204', 't.lindqvist@example.com',    2100000, 2800000, '{"West Hills","Dunthorpe"}',           '{"Contemporary"}',            'Lead')
on conflict (id) do nothing;
