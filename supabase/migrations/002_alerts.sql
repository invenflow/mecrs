create table if not exists public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  error text
);

create index if not exists scrape_runs_started_at_idx on public.scrape_runs (started_at desc);
create index if not exists scrape_runs_source_idx on public.scrape_runs (source);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  enabled boolean not null default true,
  keywords text[] not null default '{}'::text[],
  publishers text[] not null default '{}'::text[],
  sources text[] not null default '{}'::text[],
  tender_types text[] not null default '{}'::text[],
  statuses text[] not null default '{}'::text[],
  schedule text not null default 'immediate', -- immediate | daily
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alert_rules_enabled_idx on public.alert_rules (enabled);

create table if not exists public.alert_log (
  id uuid primary key default gen_random_uuid(),
  alert_rule_id uuid not null references public.alert_rules(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  sent_at timestamptz not null default now(),
  channel text not null default 'email',
  unique (alert_rule_id, tender_id, channel)
);

create index if not exists alert_log_sent_at_idx on public.alert_log (sent_at desc);

