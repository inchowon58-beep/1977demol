-- 테넌트(서브도메인)별 웹문서 수집 VM 대기열
create table if not exists public.tenant_collection_jobs (
  id text primary key,
  site_config_id uuid not null references public.site_configs(id) on delete cascade,
  site_url text not null,
  page_url text not null,
  page_id text not null,
  keyword text not null,
  slug text not null,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'failed')),
  requested_at timestamptz not null default now(),
  submitted_at timestamptz,
  error text
);

create index if not exists tenant_collection_jobs_site_status_idx
  on public.tenant_collection_jobs (site_config_id, status);

create index if not exists tenant_collection_jobs_site_url_status_idx
  on public.tenant_collection_jobs (site_url, status);

create index if not exists tenant_collection_jobs_page_idx
  on public.tenant_collection_jobs (site_config_id, page_id);

alter table public.tenant_collection_jobs enable row level security;

create policy "service role full access tenant collection jobs"
  on public.tenant_collection_jobs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
