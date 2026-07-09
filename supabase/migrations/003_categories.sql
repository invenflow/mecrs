-- Category filtering: GIN index + helper to list distinct categories
create index if not exists tenders_category_idx on public.tenders using gin (category);

create or replace function public.get_tender_categories()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select distinct unnest(category)
  from public.tenders
  where category is not null and cardinality(category) > 0
  order by 1;
$$;

grant execute on function public.get_tender_categories() to anon, authenticated;
