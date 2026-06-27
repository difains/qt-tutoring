-- =====================================================
-- QT터링 스키마 업데이트 v2
-- 실행: Supabase SQL Editor에서 이 파일 내용 실행
-- =====================================================

-- 관리자 설정 테이블 (과목/악기 목록을 DB에서 관리)
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

-- 공개: 활성 설정 읽기 가능 (튜터 신청 폼에서 과목 목록 로드)
create policy "Anyone can read active settings"
  on public.app_settings for select
  to anon, authenticated
  using (is_active = true);

-- 인증됨(관리자): 설정 전체 관리 가능
create policy "Authenticated can manage settings"
  on public.app_settings for all
  to authenticated
  using (true)
  with check (true);

-- 기본 데이터 삽입 (중복 무시)
insert into public.app_settings (category, value, label, sort_order) values
  ('subject', '국어',     '국어',     1),
  ('subject', '영어',     '영어',     2),
  ('subject', '수학',     '수학',     3),
  ('subject', '과학',     '과학',     4),
  ('subject', '사회',     '사회',     5),
  ('subject', '한국사',   '한국사',   6),
  ('subject', '악기레슨', '악기레슨', 7),
  ('instrument', '보컬',       '보컬',       1),
  ('instrument', '건반',       '건반',       2),
  ('instrument', '드럼',       '드럼',       3),
  ('instrument', '어쿠스틱 기타', '어쿠스틱 기타', 4),
  ('instrument', '일렉기타',   '일렉기타',   5),
  ('instrument', '베이스기타', '베이스기타', 6),
  ('instrument', '엔지니어',   '엔지니어',   7)
on conflict (category, value) do nothing;

-- =====================================================
-- 관리자 계정 안내
-- Supabase Dashboard → Authentication → Users → Add user:
--   Email   : admin0421@qt-tutoring.app
--   Password: 121212
-- 이후 admin.html에서 아이디 admin0421 / 비밀번호 121212 으로 로그인
-- =====================================================
