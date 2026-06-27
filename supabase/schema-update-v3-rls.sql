-- =====================================================
-- QT터링 스키마 업데이트 v3
-- 관리자 패널이 Supabase Auth 없이 anon 키로 동작하도록 RLS 수정
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- ── tutors 테이블 ──────────────────────────────────────

-- 기존 정책 제거
drop policy if exists "Public can view approved tutors"       on public.tutors;
drop policy if exists "Authenticated can manage all tutors"   on public.tutors;

-- 새 정책: 누구나 읽기 가능 (공개 페이지는 JS에서 is_approved=true 필터)
create policy "Anyone can read tutors"
  on public.tutors for select
  to anon, authenticated
  using (true);

-- 새 정책: 누구나 수정/삭제 (관리자 패널용)
create policy "Anyone can update tutors"
  on public.tutors for update
  to anon, authenticated
  using (true) with check (true);

create policy "Anyone can delete tutors"
  on public.tutors for delete
  to anon, authenticated
  using (true);

-- ── tutee_requests 테이블 ─────────────────────────────

drop policy if exists "Anyone can submit tutee request"           on public.tutee_requests;
drop policy if exists "Authenticated can manage tutee requests"   on public.tutee_requests;

-- 새 정책: 누구나 전체 관리 (신청+조회+수정)
create policy "Anyone can manage tutee requests"
  on public.tutee_requests for all
  to anon, authenticated
  using (true) with check (true);

-- ── qt_log 테이블 ──────────────────────────────────────

drop policy if exists "Authenticated can manage qt_log" on public.qt_log;

create policy "Anyone can manage qt_log"
  on public.qt_log for all
  to anon, authenticated
  using (true) with check (true);

-- ── app_settings 테이블 ────────────────────────────────

drop policy if exists "Anyone can read active settings"    on public.app_settings;
drop policy if exists "Authenticated can manage settings"  on public.app_settings;

create policy "Anyone can manage settings"
  on public.app_settings for all
  to anon, authenticated
  using (true) with check (true);
