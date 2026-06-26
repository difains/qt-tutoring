-- =====================================================
-- QT터링 "지혜를 잇다" — Supabase Schema
-- 서울중앙교회
-- =====================================================

-- 튜터 테이블
create table if not exists public.tutors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  university text not null,
  grade text not null,
  subjects text[] not null default '{}',
  instruments text[] not null default '{}',
  available_days text[] not null default '{}',
  available_times text,
  contact_type text not null check (contact_type in ('kakao', 'phone')),
  contact_value text not null,
  bio text,
  profile_image_url text,
  qt_agreement boolean not null default false,
  is_approved boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz default now() not null
);

-- 수업 희망 신청 테이블
create table if not exists public.tutee_requests (
  id uuid default gen_random_uuid() primary key,
  student_name text not null,
  school text not null,
  grade text not null,
  subjects text[] not null default '{}',
  preferred_days text[] not null default '{}',
  preferred_times text,
  contact_name text not null,
  contact_type text not null check (contact_type in ('kakao', 'phone')),
  contact_value text not null,
  tutor_id uuid references public.tutors(id) on delete set null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'matched', 'closed')),
  created_at timestamptz default now() not null
);

-- QT나눔 기록 테이블
create table if not exists public.qt_log (
  id uuid default gen_random_uuid() primary key,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  session_date date not null,
  qt_done boolean not null default true,
  note text,
  created_at timestamptz default now() not null
);

-- =====================================================
-- Row Level Security 활성화
-- =====================================================
alter table public.tutors enable row level security;
alter table public.tutee_requests enable row level security;
alter table public.qt_log enable row level security;

-- =====================================================
-- RLS 정책 — tutors
-- =====================================================

-- 공개: 승인된 활성 튜터만 조회 가능
create policy "Public can view approved tutors"
  on public.tutors for select
  to anon, authenticated
  using (is_approved = true and is_active = true);

-- 공개: QT동의 체크한 경우만 튜터 신청 가능
create policy "Anyone can apply as tutor"
  on public.tutors for insert
  to anon
  with check (qt_agreement = true);

-- 인증됨(관리자): 모든 튜터 데이터 관리 가능
create policy "Authenticated can manage all tutors"
  on public.tutors for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================
-- RLS 정책 — tutee_requests
-- =====================================================

-- 공개: 수업 희망 신청 등록 가능
create policy "Anyone can submit tutee request"
  on public.tutee_requests for insert
  to anon
  with check (true);

-- 인증됨(관리자): 모든 신청 조회 및 관리 가능
create policy "Authenticated can manage tutee requests"
  on public.tutee_requests for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================
-- RLS 정책 — qt_log
-- =====================================================

-- 인증됨(관리자): QT기록 전체 관리 가능
create policy "Authenticated can manage qt_log"
  on public.qt_log for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================
-- 인덱스 (성능 최적화)
-- =====================================================
create index if not exists idx_tutors_approved on public.tutors (is_approved, is_active);
create index if not exists idx_tutors_subjects on public.tutors using gin (subjects);
create index if not exists idx_tutee_status on public.tutee_requests (status);
create index if not exists idx_qt_log_tutor on public.qt_log (tutor_id, session_date);

-- =====================================================
-- Storage 버킷 설정 안내
-- Supabase Dashboard → Storage → New Bucket 에서 생성:
--   버킷명: tutor-profiles
--   Public 버킷: true (체크)
--   File size limit: 5MB
--   Allowed MIME types: image/jpeg, image/png, image/webp
-- =====================================================
