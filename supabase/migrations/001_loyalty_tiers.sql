create table if not exists public.points_tiers (
  id bigserial primary key,
  tier_label text not null unique,
  min_points integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_tiers (
  id bigserial primary key,
  member_id bigint not null,
  tier_label text not null,
  points_balance integer not null default 0,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id)
);

insert into public.points_tiers (tier_label, min_points, is_active)
values
  ('Bronze', 0, true),
  ('Silver', 250, true),
  ('Gold', 750, true),
  ('Platinum', 1500, true)
on conflict (tier_label) do update
set min_points = excluded.min_points,
    is_active = excluded.is_active,
    updated_at = now();

create index if not exists idx_points_tiers_active_min_points
  on public.points_tiers (is_active, min_points desc);

create index if not exists idx_member_tiers_member_id
  on public.member_tiers (member_id);

create index if not exists idx_loyalty_members_member_number
  on public.loyalty_members (member_number);

create index if not exists idx_loyalty_members_email
  on public.loyalty_members (lower(email));

create index if not exists idx_loyalty_transactions_member_id_date
  on public.loyalty_transactions (member_id, transaction_date desc);
