# QT터링 "지혜를 잇다" — 배포 가이드

> 서울중앙교회 대학/청년부 튜터링 플랫폼  
> Vercel + Supabase 기반 운영

---

## 1단계 — Supabase 프로젝트 설정

### 1-1. DB 스키마 생성
1. [Supabase Dashboard](https://supabase.com) 접속
2. 프로젝트 선택 → **SQL Editor**
3. `supabase/schema.sql` 내용 전체 복사 후 실행 (Run)

### 1-2. Storage 버킷 생성 (튜터 프로필 이미지)
1. **Storage** → **New bucket**
2. 이름: `tutor-profiles`
3. **Public bucket** 체크 ✓
4. **Create bucket**

### 1-3. 관리자 계정 생성
1. **Authentication** → **Users** → **Add user**
2. 이메일: `difains2@gmail.com`
3. 비밀번호 설정 (안전한 비밀번호 사용)

> ⚠️ 관리자 이메일/비밀번호는 Supabase에서만 관리됩니다. 소스 코드에 포함되지 않습니다.

### 1-4. 프로젝트 키 확인
1. **Settings** → **API**
2. `Project URL` 복사해두기
3. `anon public` 키 복사해두기

> ⚠️ **service_role 키는 절대 클라이언트에 넣지 마세요!**

---

## 2단계 — Vercel 배포

### 2-1. GitHub 저장소 연결
1. [Vercel](https://vercel.com) 로그인
2. **Add New Project** → GitHub 저장소 선택 (`qt-tutoring`)
3. Framework Preset: **Other**

### 2-2. 환경 변수 설정 ⚠️ 핵심
Vercel 프로젝트 → **Settings** → **Environment Variables** 에서 추가:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public 키 |

### 2-3. 빌드 설정 확인
- Build Command: `npm run build`
- Output Directory: `.`
- (vercel.json에 이미 설정되어 있어 자동 적용됩니다)

### 2-4. 배포
- **Deploy** 클릭 → 자동으로 빌드 및 배포

---

## 3단계 — 로컬 개발

```bash
# 환경 변수를 직접 설정하여 config.js 생성
$env:SUPABASE_URL="https://your-project-id.supabase.co"
$env:SUPABASE_ANON_KEY="your-anon-key-here"
npm run build
```

로컬 서버 실행 (파일을 직접 열면 CORS 오류 발생):
```bash
# Node.js가 있는 경우
npx serve .
```

브라우저에서 `http://localhost:3000` 접속

---

## 파일 구조

```
qt-tutoring/
├── index.html              # 메인 랜딩 페이지
├── admin.html              # 관리자 패널
├── vercel.json             # Vercel 배포 설정 + 보안 헤더
├── package.json            # 빌드 스크립트 정의
├── scripts/
│   └── generate-config.js  # 환경 변수 → js/config.js 생성
├── css/
│   ├── style.css           # 메인 스타일
│   └── admin.css           # 관리자 스타일
├── js/
│   ├── config.js           # ⚠️ .gitignore (빌드 시 자동 생성)
│   ├── config.example.js   # 예시 파일 (커밋됨)
│   ├── supabase-client.js  # Supabase 초기화
│   ├── app.js              # 메인 앱 로직
│   └── admin.js            # 관리자 패널 로직 (v3 — Supabase Auth)
├── supabase/
│   └── schema.sql          # DB 스키마 + RLS 정책
├── .gitignore
└── README.md
```

---

## 관리자 패널 접속

**접속 URL:** `https://[프로젝트명].vercel.app/admin`

**로그인:** Supabase Authentication에 등록된 이메일 + 비밀번호

> 관리자 자격증명은 소스 코드에 포함되지 않습니다.
> Supabase Dashboard → Authentication → Users 에서 관리하세요.

### 기능
| 메뉴 | 설명 |
|------|------|
| 대시보드 | 전체 통계 요약 |
| 튜터 승인 대기 | 신청 검토 후 승인/반려 |
| 전체 튜터 | 활성화/비활성화, CSV 내보내기 |
| 수업 신청 목록 | 매칭/종료 처리, CSV 내보내기 |
| QT나눔 기록 | 수업별 QT진행 기록 관리 |

---

## 보안 체크리스트

- [x] `js/config.js`가 `.gitignore`에 포함
- [x] 관리자 자격증명이 소스 코드에 없음 (Supabase Auth 사용)
- [x] Vercel 환경 변수로 Supabase 키 관리
- [x] 보안 HTTP 헤더 (X-Frame-Options, CSP 등) 적용
- [x] Supabase RLS 정책 활성화
- [ ] `service_role` 키를 어디에도 넣지 않았는가
- [ ] Supabase RLS 정책이 활성화되어 있는가
- [ ] Storage 버킷 RLS 정책이 설정되어 있는가

---

## 문의

담당자: difains2@gmail.com  
서울중앙교회 대학/청년부 QT터링 사역팀
