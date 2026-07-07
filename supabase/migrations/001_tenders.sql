-- Core tenders table + indexes for search and filtering
create extension if not exists pgcrypto;

create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  source text not null,
  source_url text not null unique,
  title text not null,
  description text not null default '',
  publisher text,
  tender_type text,
  status text,
  category text[],
  publication_date timestamptz,
  submission_deadline timestamptz,
  opening_date timestamptz,
  estimated_value numeric,
  currency text not null default 'ILS',
  location text,
  contact_name text,
  contact_email text,
  contact_phone text,
  documents jsonb not null default '[]'::jsonb,
  raw_data jsonb,
  content_hash text,
  first_seen_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists tenders_submission_deadline_idx on public.tenders (submission_deadline desc);
create index if not exists tenders_publication_date_idx on public.tenders (publication_date desc);
create index if not exists tenders_status_idx on public.tenders (status);
create index if not exists tenders_publisher_idx on public.tenders (publisher);
create index if not exists tenders_source_idx on public.tenders (source);

-- Hebrew-friendly full-text search on title+description
alter table public.tenders
  add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
  ) stored;

create index if not exists tenders_search_tsv_idx on public.tenders using gin (search_tsv);

