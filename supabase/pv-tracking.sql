-- =====================================================
-- QT터링 PV 추적 테이블 및 함수 생성
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- page_views 테이블
create table if not exists public.page_views (
  id uuid default gen_random_uuid() primary key,
  visit_date date not null unique,
  view_count integer not null default 0,
  updated_at timestamptz default now()
);

alter table public.page_views enable row level security;

drop policy if exists "Anyone can manage page_views" on public.page_views;
create policy "Anyone can manage page_views"
  on public.page_views for all
  to anon, authenticated
  using (true) with check (true);

-- 방문 수 증가 함수 (날짜별 upsert)
create or replace function public.increment_page_view(p_date date)
returns void language plpgsql security definer as $$
begin
  insert into public.page_views (visit_date, view_count, updated_at)
  values (p_date, 1, now())
  on conflict (visit_date)
  do update set
    view_count = page_views.view_count + 1,
    updated_at = now();
end;
$$;

-- 함수 실행 권한 부여
grant execute on function public.increment_page_view(date) to anon, authenticated;

-- 완료!
