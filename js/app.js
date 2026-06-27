// js/app.js — QT터링 메인 앱 로직

/* ================================================================
   상수 & 설정
   ================================================================ */
// 기본값 (DB 연결 실패 시 폴백)
window.SUBJECTS    = ['국어', '영어', '수학', '과학', '사회', '한국사', '악기레슨'];
window.INSTRUMENTS = ['보컬', '건반', '드럼', '어쿠스틱 기타', '일렉기타', '베이스기타', '엔지니어'];
const DAYS         = ['월', '화', '수', '목', '금', '토', '일'];
const GRADES_TUTOR = ['대학교 1학년', '대학교 2학년', '대학교 3학년', '대학교 4학년', '대학원생', '졸업생'];
const GRADES_TUTEE = [
  '초등 5학년', '초등 6학년',
  '중학교 1학년', '중학교 2학년', '중학교 3학년',
  '고등학교 1학년', '고등학교 2학년', '고등학교 3학년'
];

let allTutors = [];
let activeFilter = 'all';
let selectedTutor = null;

/* ================================================================
   초기화
   ================================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  initParticles();
  initScrollReveal();
  initMobileMenu();
  await loadSettingsFromDB();   // DB 설정 로드 (완료 후 폼 빌드)
  buildCheckboxGroups();
  buildFilterTabs();
  loadTutors();
  initTutorForm();
  initTuteeForm();
  initModal();
  initFAQ();
});

/* ================================================================
   DB에서 설정 로드 (app_settings 테이블)
   ================================================================ */
async function loadSettingsFromDB() {
  if (!window.db) return; // DB 미연결 시 기본값 유지
  const { data, error } = await window.db
    .from('app_settings')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error || !data) return;
  const subjects    = data.filter(s => s.category === 'subject').map(s => s.value);
  const instruments = data.filter(s => s.category === 'instrument').map(s => s.value);
  if (subjects.length)    window.SUBJECTS    = subjects;
  if (instruments.length) window.INSTRUMENTS = instruments;
}

/* ================================================================
   네비게이션
   ================================================================ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });
}

function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');

  hamburger?.addEventListener('click', () => mobileMenu.classList.add('open'));
  mobileClose?.addEventListener('click', () => mobileMenu.classList.remove('open'));
  mobileMenu?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });
}

/* ================================================================
   파티클 (히어로 배경)
   ================================================================ */
function initParticles() {
  const container = document.querySelector('.hero-particles');
  if (!container) return;
  const count = window.innerWidth < 768 ? 8 : 16;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1.5;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      opacity:${Math.random() * 0.4 + 0.1};
      animation-duration:${Math.random() * 12 + 10}s;
      animation-delay:${Math.random() * -15}s;
    `;
    container.appendChild(p);
  }
}

/* ================================================================
   스크롤 리빌 애니메이션
   ================================================================ */
function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.12 }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ================================================================
   체크박스 그룹 동적 생성
   ================================================================ */
function buildCheckboxGroups() {
  // 튜터 폼 — 과목
  buildCheckboxGroup('tutor-subjects',    window.SUBJECTS,    'tutor_subject');
  buildCheckboxGroup('tutor-instruments', window.INSTRUMENTS, 'tutor_instrument');
  buildCheckboxGroup('tutor-days',        DAYS,               'tutor_day');
  buildCheckboxGroup('tutee-subjects',    window.SUBJECTS,    'tutee_subject');
  buildCheckboxGroup('tutee-days',        DAYS,               'tutee_day');
  buildSelectOptions('tutor-grade',       GRADES_TUTOR);
  buildSelectOptions('tutee-grade',       GRADES_TUTEE);

  // 필터 탭도 동적으로 다시 빌드 (DB 설정 반영)
  buildFilterTabs();

  // 과목에 '악기레슨' 선택 시 악기 그룹 표시
  document.querySelectorAll('input[name="tutor_subject"]').forEach(cb => {
    cb.addEventListener('change', toggleInstrumentSection);
  });
  toggleInstrumentSection();
}

function buildCheckboxGroup(containerId, items, name) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = items.map(item => `
    <div class="checkbox-item">
      <input type="checkbox" id="${name}_${item}" name="${name}" value="${item}">
      <label for="${name}_${item}">${item}</label>
    </div>
  `).join('');
}

function buildSelectOptions(selectId, options) {
  const el = document.getElementById(selectId);
  if (!el) return;
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    el.appendChild(o);
  });
}

function toggleInstrumentSection() {
  const hasInstrument = [...document.querySelectorAll('input[name="tutor_subject"]:checked')]
    .some(cb => cb.value === '악기레슨');
  const section = document.getElementById('instrument-section');
  if (section) section.style.display = hasInstrument ? 'block' : 'none';
}

/* ================================================================
   필터 탭 생성
   ================================================================ */
function buildFilterTabs() {
  const container = document.getElementById('filter-tabs');
  if (!container) return;
  const FILTER_MAP = { all: '전체' };
  window.SUBJECTS.forEach(s => { FILTER_MAP[s] = s; });
  FILTER_MAP['악기레슨'] = '악기레슨'; // 중복 허용
  container.innerHTML = Object.entries(FILTER_MAP).map(([key, label]) => `
    <button class="filter-tab${key === 'all' ? ' active' : ''}" data-filter="${key}">${label}</button>
  `).join('');
  container.addEventListener('click', e => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    container.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    renderTutors();
  });
}

/* ================================================================
   튜터 목록 로드 & 렌더
   ================================================================ */
async function loadTutors() {
  const grid = document.getElementById('tutors-grid');
  if (!grid) return;

  // 스켈레톤 로딩
  grid.innerHTML = Array(4).fill(null).map(() => `
    <div class="skeleton-card">
      <div style="display:flex;gap:.75rem;align-items:center;margin-bottom:1rem">
        <div class="skeleton-circle"></div>
        <div style="flex:1"><div class="skeleton-line" style="width:60%;margin-bottom:.5rem"></div><div class="skeleton-line short"></div></div>
      </div>
      <div class="skeleton-line"></div><div class="skeleton-line short"></div>
    </div>
  `).join('');

  if (!window.db) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>데이터베이스 연결 설정이 필요합니다.<br>관리자에게 문의해 주세요.</p></div>';
    return;
  }

  const { data, error } = await window.db
    .from('tutors')
    .select('*')
    .eq('is_approved', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[QT터링] 튜터 로드 실패:', error);
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>튜터 목록을 불러오지 못했습니다.</p></div>';
    return;
  }

  allTutors = data || [];
  renderTutors();
}

function renderTutors() {
  const grid = document.getElementById('tutors-grid');
  if (!grid) return;

  const filtered = activeFilter === 'all'
    ? allTutors
    : allTutors.filter(t =>
        t.subjects?.includes(activeFilter) ||
        (activeFilter === '악기레슨' && t.instruments?.length > 0)
      );

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>해당 과목의 튜터가 아직 없습니다.<br>곧 멋진 튜터들이 찾아올 거예요!</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(tutor => renderTutorCard(tutor)).join('');

  // 카드 클릭 이벤트
  grid.querySelectorAll('.tutor-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      openTutorModal(allTutors.find(t => t.id === id));
    });
  });
}

function renderTutorCard(tutor) {
  const initials = tutor.name?.slice(0, 1) || '?';
  const avatarHtml = tutor.profile_image_url
    ? `<img src="${escHtml(tutor.profile_image_url)}" alt="${escHtml(tutor.name)}">`
    : initials;
  const subjectTags = (tutor.subjects || [])
    .map(s => `<span class="tag tag-subject">${escHtml(s)}</span>`).join('');
  const instrumentTags = (tutor.instruments || [])
    .map(i => `<span class="tag tag-instrument">🎵 ${escHtml(i)}</span>`).join('');
  const days = (tutor.available_days || []).join(' · ') || '-';

  return `
    <div class="tutor-card reveal" data-id="${escHtml(tutor.id)}">
      <div class="tutor-card-header">
        <div class="tutor-avatar">${avatarHtml}</div>
        <div>
          <div class="tutor-name">${escHtml(tutor.name)}</div>
          <div class="tutor-univ">${escHtml(tutor.university)} · ${escHtml(tutor.grade)}</div>
        </div>
      </div>
      <div class="tutor-subjects">
        ${subjectTags}${instrumentTags}
      </div>
      <div class="tutor-days">가능 요일: <span>${escHtml(days)}</span></div>
      <div class="tutor-card-footer">
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="event.stopPropagation(); openTutorModal(allTutors.find(t=>t.id==='${escHtml(tutor.id)}'))">상세보기</button>
      </div>
    </div>
  `;
}

/* ================================================================
   튜터 모달
   ================================================================ */
function initModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay?.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openTutorModal(tutor) {
  if (!tutor) return;
  selectedTutor = tutor;

  const overlay = document.getElementById('modal-overlay');
  const initials = tutor.name?.slice(0, 1) || '?';
  const avatarHtml = tutor.profile_image_url
    ? `<img src="${escHtml(tutor.profile_image_url)}" alt="${escHtml(tutor.name)}">`
    : initials;

  const subjectTags = (tutor.subjects || [])
    .map(s => `<span class="tag tag-subject">${escHtml(s)}</span>`).join('');
  const instrumentTags = (tutor.instruments || [])
    .map(i => `<span class="tag tag-instrument">🎵 ${escHtml(i)}</span>`).join('');
  const days = (tutor.available_days || []).join(' · ') || '미정';
  const times = tutor.available_times || '튜티와 협의';
  const contactLabel = tutor.contact_type === 'kakao' ? '카카오 오픈채팅' : '전화번호';
  const contactHref = tutor.contact_type === 'kakao'
    ? tutor.contact_value
    : `tel:${tutor.contact_value}`;

  document.getElementById('modal-body').innerHTML = `
    <div class="modal-tutor-avatar">${avatarHtml}</div>
    <div class="modal-name">${escHtml(tutor.name)}</div>
    <div class="modal-univ">${escHtml(tutor.university)} · ${escHtml(tutor.grade)}</div>

    <div class="modal-section-label">가르칠 수 있는 과목</div>
    <div style="display:flex;flex-wrap:wrap;gap:.4rem;">${subjectTags}${instrumentTags}</div>

    <div class="modal-section-label">가능 요일 & 시간</div>
    <p style="font-size:.88rem;color:rgba(255,255,255,.6)">${escHtml(days)} / ${escHtml(times)}</p>

    ${tutor.bio ? `
    <div class="modal-section-label">자기소개</div>
    <div class="modal-bio">${escHtml(tutor.bio)}</div>
    ` : ''}

    <a href="${escHtml(contactHref)}" target="_blank" rel="noopener" class="btn btn-primary btn-block modal-contact-btn">
      📱 ${escHtml(contactLabel)}으로 연락하기
    </a>
    <p style="font-size:.78rem;color:rgba(255,255,255,.35);text-align:center;margin-top:.75rem">
      💡 수업 시작 후 첫 15분은 QT나눔 시간입니다.
    </p>
  `;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
  selectedTutor = null;
}

/* ================================================================
   튜터 신청 폼
   ================================================================ */
function initTutorForm() {
  const form = document.getElementById('tutor-form');
  if (!form) return;

  // 이미지 미리보기
  const imageInput = document.getElementById('tutor-image');
  const preview = document.getElementById('image-preview');
  const uploadText = document.getElementById('upload-text');
  imageInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('이미지 파일은 5MB 이하로 올려주세요.', 'error');
      imageInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      preview.src = ev.target.result;
      preview.style.display = 'block';
      uploadText.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateTutorForm()) return;
    await submitTutorForm();
  });
}

function validateTutorForm() {
  let valid = true;
  const required = ['tutor-name', 'tutor-university', 'tutor-grade', 'tutor-contact-value', 'tutor-times'];
  required.forEach(id => {
    const el = document.getElementById(id);
    const err = document.getElementById(id + '-error');
    if (el && !el.value.trim()) {
      el.classList.add('error');
      if (err) err.classList.add('show');
      valid = false;
    } else {
      el?.classList.remove('error');
      if (err) err.classList.remove('show');
    }
  });

  const subjects = [...document.querySelectorAll('input[name="tutor_subject"]:checked')];
  const subjectsErr = document.getElementById('tutor-subjects-error');
  if (subjects.length === 0) {
    if (subjectsErr) subjectsErr.classList.add('show');
    valid = false;
  } else {
    if (subjectsErr) subjectsErr.classList.remove('show');
  }

  const days = [...document.querySelectorAll('input[name="tutor_day"]:checked')];
  const daysErr = document.getElementById('tutor-days-error');
  if (days.length === 0) {
    if (daysErr) daysErr.classList.add('show');
    valid = false;
  } else {
    if (daysErr) daysErr.classList.remove('show');
  }

  const contactType = document.querySelector('input[name="tutor_contact_type"]:checked');
  if (!contactType) {
    document.getElementById('contact-type-error')?.classList.add('show');
    valid = false;
  } else {
    document.getElementById('contact-type-error')?.classList.remove('show');
  }

  const qtAgree = document.getElementById('qt-agree');
  const qtErr = document.getElementById('qt-agree-error');
  if (!qtAgree?.checked) {
    if (qtErr) qtErr.classList.add('show');
    valid = false;
  } else {
    if (qtErr) qtErr.classList.remove('show');
  }

  return valid;
}

async function submitTutorForm() {
  if (!window.db) {
    showToast('데이터베이스 연결이 필요합니다.', 'error');
    return;
  }

  const submitBtn = document.getElementById('tutor-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> 제출 중...';

  try {
    let profile_image_url = null;

    // 이미지 업로드
    const imageFile = document.getElementById('tutor-image')?.files[0];
    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const filename = `${crypto.randomUUID()}.${ext}`;
      const { data: uploadData, error: uploadError } = await window.db.storage
        .from('tutor-profiles')
        .upload(filename, imageFile, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = window.db.storage
        .from('tutor-profiles')
        .getPublicUrl(filename);
      profile_image_url = urlData.publicUrl;
    }

    const payload = {
      name: document.getElementById('tutor-name').value.trim(),
      university: document.getElementById('tutor-university').value.trim(),
      grade: document.getElementById('tutor-grade').value,
      subjects: [...document.querySelectorAll('input[name="tutor_subject"]:checked')].map(c => c.value),
      instruments: [...document.querySelectorAll('input[name="tutor_instrument"]:checked')].map(c => c.value),
      available_days: [...document.querySelectorAll('input[name="tutor_day"]:checked')].map(c => c.value),
      available_times: document.getElementById('tutor-times').value.trim(),
      contact_type: document.querySelector('input[name="tutor_contact_type"]:checked')?.value,
      contact_value: document.getElementById('tutor-contact-value').value.trim(),
      bio: document.getElementById('tutor-bio').value.trim(),
      profile_image_url,
      qt_agreement: true,
    };

    const { error } = await window.db.from('tutors').insert([payload]);
    if (error) throw error;

    showToast('✅ 튜터 신청이 완료되었습니다! 관리자 승인 후 리스트에 표시됩니다.', 'success');
    document.getElementById('tutor-form').reset();
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('upload-text').style.display = 'block';
    toggleInstrumentSection();

  } catch (err) {
    console.error('[QT터링] 튜터 신청 실패:', err);
    showToast('신청 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '튜터 신청서 제출하기 →';
  }
}

/* ================================================================
   튜티 신청 폼
   ================================================================ */
function initTuteeForm() {
  const form = document.getElementById('tutee-form');
  if (!form) return;

  // 튜터 선택 옵션 채우기
  populateTutorSelect();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateTuteeForm()) return;
    await submitTuteeForm();
  });
}

function populateTutorSelect() {
  const select = document.getElementById('tutee-tutor-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- 특정 튜터 지정 안함 --</option>';
  allTutors.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.name} (${t.university} · ${(t.subjects || []).join(', ')})`;
    select.appendChild(opt);
  });
}

function validateTuteeForm() {
  let valid = true;
  const required = ['tutee-student-name', 'tutee-school', 'tutee-grade', 'tutee-contact-name', 'tutee-contact-value'];
  required.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value.trim()) {
      el.classList.add('error');
      valid = false;
    } else {
      el?.classList.remove('error');
    }
  });
  const subjects = [...document.querySelectorAll('input[name="tutee_subject"]:checked')];
  if (subjects.length === 0) {
    document.getElementById('tutee-subjects-error')?.classList.add('show');
    valid = false;
  } else {
    document.getElementById('tutee-subjects-error')?.classList.remove('show');
  }
  const contactType = document.querySelector('input[name="tutee_contact_type"]:checked');
  if (!contactType) {
    document.getElementById('tutee-contact-type-error')?.classList.add('show');
    valid = false;
  } else {
    document.getElementById('tutee-contact-type-error')?.classList.remove('show');
  }
  return valid;
}

async function submitTuteeForm() {
  if (!window.db) {
    showToast('데이터베이스 연결이 필요합니다.', 'error');
    return;
  }

  const submitBtn = document.getElementById('tutee-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> 제출 중...';

  try {
    const tutorId = document.getElementById('tutee-tutor-select')?.value || null;
    const payload = {
      student_name: document.getElementById('tutee-student-name').value.trim(),
      school: document.getElementById('tutee-school').value.trim(),
      grade: document.getElementById('tutee-grade').value,
      subjects: [...document.querySelectorAll('input[name="tutee_subject"]:checked')].map(c => c.value),
      preferred_days: [...document.querySelectorAll('input[name="tutee_day"]:checked')].map(c => c.value),
      preferred_times: document.getElementById('tutee-times').value.trim(),
      contact_name: document.getElementById('tutee-contact-name').value.trim(),
      contact_type: document.querySelector('input[name="tutee_contact_type"]:checked')?.value,
      contact_value: document.getElementById('tutee-contact-value').value.trim(),
      tutor_id: tutorId || null,
      message: document.getElementById('tutee-message').value.trim(),
    };

    const { error } = await window.db.from('tutee_requests').insert([payload]);
    if (error) throw error;

    showToast('✅ 수업 신청이 완료되었습니다! 담당자가 연락드릴 예정입니다.', 'success');
    document.getElementById('tutee-form').reset();

  } catch (err) {
    console.error('[QT터링] 수업 신청 실패:', err);
    showToast('신청 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '수업 신청하기 →';
  }
}

/* ================================================================
   FAQ 아코디언
   ================================================================ */
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-answer').style.maxHeight = '0';
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

/* ================================================================
   토스트 알림
   ================================================================ */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icon = type === 'success' ? '✅' : '❌';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ================================================================
   유틸리티
   ================================================================ */
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 튜터 모달에서 직접 호출 가능하도록 전역 노출
window.openTutorModal = openTutorModal;
window.allTutors = allTutors;
