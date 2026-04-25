create table if not exists loyalty_members (
  id text primary key,
  member_number text unique,
  first_name text,
  last_name text,
  email text unique,
  phone text,
  birthdate date,
  points_balance integer not null default 0,
  tier text not null default 'Bronze',
  enrollment_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists loyalty_points_history (
  id text primary key,
  member_id text not null references loyalty_members(id) on delete cascade,
  type text not null,
  points integer not null,
  reason text,
  reference text,
  expiry_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists loyalty_campaigns (
  id text primary key,
  campaign_code text unique,
  campaign_name text not null,
  campaign_type text not null default 'bonus_points',
  status text not null default 'draft',
  multiplier numeric not null default 1,
  minimum_purchase_amount numeric not null default 0,
  bonus_points integer not null default 0,
  product_scope jsonb not null default '[]'::jsonb,
  eligible_tiers jsonb not null default '[]'::jsonb,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  budget_limit numeric,
  budget_spent numeric not null default 0,
  auto_pause boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists loyalty_segments (
  id text primary key,
  name text not null unique,
  description text,
  logic_mode text not null default 'AND',
  is_system boolean not null default false,
  member_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists loyalty_segment_conditions (
  id text primary key,
  segment_id text not null references loyalty_segments(id) on delete cascade,
  field text not null,
  operator text not null,
  value text,
  created_at timestamptz not null default now()
);

create table if not exists loyalty_notifications (
  id text primary key,
  member_id text,
  channel text not null,
  subject text,
  message text not null,
  status text not null default 'pending',
  is_promotional boolean not null default true,
  read boolean not null default false,
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists loyalty_communications (
  id text primary key,
  campaign_id text,
  member_id text,
  channel text not null,
  recipient text,
  subject text,
  message text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table if not exists loyalty_rewards (
  id text primary key,
  name text not null,
  description text,
  points_cost integer not null default 0,
  category text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists loyalty_partners (
  id text primary key,
  partner_code text unique,
  partner_name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists loyalty_partner_transactions (
  id text primary key,
  partner_id text not null,
  member_id text,
  amount numeric not null default 0,
  points integer not null default 0,
  status text not null default 'posted',
  settlement_id text,
  created_at timestamptz not null default now()
);

create table if not exists loyalty_partner_settlements (
  id text primary key,
  partner_id text not null,
  month text not null,
  amount numeric not null default 0,
  transaction_ids jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, month)
);

create index if not exists idx_loyalty_members_email on loyalty_members(email);
create index if not exists idx_loyalty_members_tier on loyalty_members(tier);
create index if not exists idx_loyalty_points_history_member_created on loyalty_points_history(member_id, created_at desc);
create index if not exists idx_loyalty_campaigns_status on loyalty_campaigns(status);
create index if not exists idx_loyalty_segments_name on loyalty_segments(name);
create index if not exists idx_loyalty_notifications_member_created on loyalty_notifications(member_id, created_at desc);
create index if not exists idx_loyalty_partner_transactions_partner_created on loyalty_partner_transactions(partner_id, created_at desc);
create index if not exists idx_loyalty_partner_settlements_partner_month on loyalty_partner_settlements(partner_id, month);

insert into loyalty_rewards (id, name, description, points_cost, category, status)
values
  ('REWARD-001', 'Free Pastry', 'Choose from croissant, muffin, or danish', 150, 'Food', 'active'),
  ('REWARD-002', 'Free Regular Coffee', 'Any regular-sized hot or iced coffee', 120, 'Beverage', 'active'),
  ('REWARD-003', 'Free Large Specialty Drink', 'Any large-sized specialty beverage', 280, 'Beverage', 'active')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  points_cost = excluded.points_cost,
  category = excluded.category,
  status = excluded.status,
  updated_at = now();
