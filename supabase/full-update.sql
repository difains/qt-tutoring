-- =====================================================
-- QT터링 전체 SQL 업데이트 (v2 + v3 통합본)
-- Supabase SQL Editor에서 이 파일 전체를 실행하세요
-- 이미 실행한 것이 있어도 중복 실행 안전함
-- =====================================================

-- ── app_settings 테이블 생성 ───────────────────────

create table if not exists public.app_settings (
  id uuid default gen_random_uuid() primary key,
  category text not null check (category in ('subject', 'instrument')),
  value text not null,
  label text not null,
  sort_order integer default 0,
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  unique (category, value)
);

alter table public.app_settings enable row level security;

-- ── 기존 RLS 정책 전부 제거 후 재생성 ────────────────
-- (중복 오류 방지)

-- tutors
drop policy if exists "Public can view approved tutors"     on public.tutors;
drop policy if exists "Anyone can apply as tutor"           on public.tutors;
drop policy if exists "Authenticated can manage all tutors" on public.tutors;
drop policy if exists "Anyone can read tutors"              on public.tutors;
drop policy if exists "Anyone can update tutors"            on public.tutors;
drop policy if exists "Anyone can delete tutors"            on public.tutors;

-- tutee_requests
drop policy if exists "Anyone can submit tutee request"          on public.tutee_requests;
drop policy if exists "Authenticated can manage tutee requests"  on public.tutee_requests;
drop policy if exists "Anyone can manage tutee requests"         on public.tutee_requests;

-- qt_log
drop policy if exists "Authenticated can manage qt_log" on public.qt_log;
drop policy if exists "Anyone can manage qt_log"        on public.qt_log;

-- app_settings
drop policy if exists "Anyone can read active settings"   on public.app_settings;
drop policy if exists "Authenticated can manage settings" on public.app_settings;
drop policy if exists "Anyone can manage settings"        on public.app_settings;

-- ── 새 RLS 정책 생성 ─────────────────────────────────
-- 관리자 패널이 Supabase Auth 없이 anon 키로 동작
-- 보안: 클라이언트 로그인(admin0421/121212)이 1차 방어선

-- tutors: 누구나 읽기 (공개 UI는 JS에서 is_approved=true 필터)
create policy "Anyone can read tutors"
  on public.tutors for select
  to anon, authenticated
  using (true);

-- tutors: QT동의 시 신청 가능
create policy "Anyone can apply as tutor"
  on public.tutors for insert
  to anon, authenticated
  with check (qt_agreement = true);

-- tutors: 관리자 승인/거절/수정
create policy "Anyone can update tutors"
  on public.tutors for update
  to anon, authenticated
  using (true) with check (true);

create policy "Anyone can delete tutors"
  on public.tutors for delete
  to anon, authenticated
  using (true);

-- tutee_requests: 신청 + 관리자 조회/수정
create policy "Anyone can manage tutee requests"
  on public.tutee_requests for all
  to anon, authenticated
  using (true) with check (true);

-- qt_log: 관리자 관리
create policy "Anyone can manage qt_log"
  on public.qt_log for all
  to anon, authenticated
  using (true) with check (true);

-- app_settings: 공개 읽기 + 관리자 관리
create policy "Anyone can manage settings"
  on public.app_settings for all
  to anon, authenticated
  using (true) with check (true);

-- ── app_settings 기본 데이터 ──────────────────────────

insert into public.app_settings (category, value, label, sort_order) values
  ('subject', '국어',     '국어',     1),
  ('subject', '영어',     '영어',     2),
  ('subject', '수학',     '수학',     3),
  ('subject', '과학',     '과학',     4),
  ('subject', '사회',     '사회',     5),
  ('subject', '한국사',   '한국사',   6),
  ('subject', '악기레슨', '악기레슨', 7),
  ('instrument', '보컬',          '보컬',          1),
  ('instrument', '건반',          '건반',          2),
  ('instrument', '드럼',          '드럼',          3),
  ('instrument', '어쿠스틱 기타', '어쿠스틱 기타', 4),
  ('instrument', '일렉기타',      '일렉기타',      5),
  ('instrument', '베이스기타',    '베이스기타',    6),
  ('instrument', '엔지니어',      '엔지니어',      7)
on conflict (category, value) do nothing;

-- ── 인덱스 (이미 있으면 무시) ─────────────────────────

create index if not exists idx_tutors_approved  on public.tutors (is_approved, is_active);
create index if not exists idx_tutors_subjects  on public.tutors using gin (subjects);
create index if not exists idx_tutee_status     on public.tutee_requests (status);
create index if not exists idx_qt_log_tutor     on public.qt_log (tutor_id, session_date);

-- 완료!
