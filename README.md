# QT터링 "지혜를 잇다" — 배포 가이드

> 서울중앙교회 대학/청년부 튜터링 플랫폼  
> GitHub Pages + Supabase 기반 무료 운영

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

### 1-4. 프로젝트 키 확인
1. **Settings** → **API**
2. `Project URL` 복사해두기
3. `anon public` 키 복사해두기

> ⚠️ **service_role 키는 절대 클라이언트에 넣지 마세요!**

---

## 2단계 — GitHub 저장소 설정

### 2-1. 저장소 생성
1. GitHub에서 새 저장소 생성 (예: `qt-tutoring`)
2. **Public** 또는 **Private** (GitHub Pages는 Public 추천)

### 2-2. 코드 푸시
```bash
cd qt-tutoring
git init
git add .
git commit -m "초기 커밋 — QT터링 랜딩 페이지"
git remote add origin https://github.com/[내-계정]/qt-tutoring.git
git push -u origin main
```

### 2-3. GitHub Secrets 설정 (⚠️ 핵심 보안 단계)
1. 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭 후 2개 추가:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public 키 |

### 2-4. GitHub Pages 활성화
1. 저장소 → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **gh-pages** / **/ (root)**
4. **Save**

### 2-5. 배포 트리거
- `main` 브랜치에 push할 때마다 자동 배포
- 또는 **Actions** → **Deploy QT터링** → **Run workflow**로 수동 배포

---

## 3단계 — 로컬 개발 환경 설정

```bash
# config.js 생성 (gitignore 처리됨)
cp js/config.example.js js/config.js
```

`js/config.js` 파일을 열어 실제 키 값 입력:
```javascript
window.SUPABASE_URL = 'https://your-project-id.supabase.co';
window.SUPABASE_ANON_KEY = 'your-anon-key-here';
```

로컬 서버 실행 (파일을 직접 열면 CORS 오류 발생):
```bash
# Python이 있는 경우
python -m http.server 8080

# Node.js가 있는 경우
npx serve .
```

브라우저에서 `http://localhost:8080` 접속

---

## 파일 구조

```
qt-tutoring/
├── index.html              # 메인 랜딩 페이지
├── admin.html              # 관리자 패널
├── css/
│   ├── style.css           # 메인 스타일
│   └── admin.css           # 관리자 스타일
├── js/
│   ├── config.js           # ⚠️ .gitignore (로컬/CI 생성)
│   ├── config.example.js   # 예시 파일 (커밋됨)
│   ├── supabase-client.js  # Supabase 초기화
│   ├── app.js              # 메인 앱 로직
│   └── admin.js            # 관리자 패널 로직
├── supabase/
│   └── schema.sql          # DB 스키마 + RLS 정책
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions 자동 배포
├── .gitignore
└── README.md
```

---

## 관리자 패널 사용법

**접속 URL:** `https://[계정].github.io/qt-tutoring/admin.html`

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

- [ ] `js/config.js`가 `.gitignore`에 포함되어 있는가
- [ ] GitHub Secrets에 키가 등록되어 있는가
- [ ] `service_role` 키를 어디에도 넣지 않았는가
- [ ] Supabase RLS 정책이 활성화되어 있는가
- [ ] Storage 버킷 RLS 정책이 설정되어 있는가

---

## 문의

담당자: difains2@gmail.com  
서울중앙교회 대학/청년부 QT터링 사역팀
