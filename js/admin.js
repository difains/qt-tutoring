// js/admin.js — QT터링 관리자 패널 로직 v2

/* ================================================================
   상수 — 관리자 자격증명
   ================================================================ */
const ADMIN_ID  = 'admin0421';
const ADMIN_PW  = '121212';
const SESSION_KEY = 'qt_admin_session';

/* ================================================================
   초기화
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNavigation();
  initMobileSidebar();
  initDetailModal();
});

/* ================================================================
   인증 (순수 클라이언트 세션 방식)
   ================================================================ */
async function initAuth() {
  // 기존 세션 확인
  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    document.getElementById('logged-in-id').textContent = ADMIN_ID;
    showDashboard();
  }

  // 로그인 폼
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const inputId = document.getElementById('admin-id').value.trim();
    const inputPw = document.getElementById('admin-password').value;

    if (!inputId || !inputPw) {
      showLoginError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }

    if (inputId === ADMIN_ID && inputPw === ADMIN_PW) {
      sessionStorage.setItem(SESSION_KEY, '1');
      document.getElementById('logged-in-id').textContent = ADMIN_ID;
      showDashboard();
    } else {
      showLoginError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  });

  // 로그아웃
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    showLoginScreen();
  });
}

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-dashboard').style.display = 'none';
}

function showLoginError(msg) {
  document.getElementById('login-error').textContent = msg;
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'flex';
  loadDashboardData();
}

/* ================================================================
   사이드바 네비게이션
   ================================================================ */
function initNavigation() {
  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    link.addEventListener('click', () => {
      const page = link.dataset.page;
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${page}`)?.classList.add('active');

      closeMobileSidebar();

      switch (page) {
        case 'tutors-pending':  loadPendingTutors();   break;
        case 'tutors-all':      loadAllTutors();        break;
        case 'tutee-requests':  loadTuteeRequests();    break;
        case 'qt-log':          initQtLogPage();        break;
        case 'settings':        loadSettings();         break;
      }
    });
  });
}

/* ================================================================
   모바일 사이드바
   ================================================================ */
function initMobileSidebar() {
  const hamburger = document.getElementById('admin-hamburger');
  const sidebar   = document.getElementById('admin-sidebar');
  const overlay   = document.getElementById('admin-sidebar-overlay');

  hamburger?.addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('show');
  });
  overlay?.addEventListener('click', closeMobileSidebar);
}
function closeMobileSidebar() {
  document.getElementById('admin-sidebar')?.classList.remove('open');
  document.getElementById('admin-sidebar-overlay')?.classList.remove('show');
}

/* ================================================================
   대시보드 통계
   ================================================================ */
async function loadDashboardData() {
  if (!window.db) return;
  const [r1, r2, r3, r4] = await Promise.all([
    window.db.from('tutors').select('id', { count: 'exact', head: true }).eq('is_approved', true),
    window.db.from('tutors').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    window.db.from('tutee_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    window.db.from('tutee_requests').select('id', { count: 'exact', head: true }).eq('status', 'matched'),
  ]);
  document.getElementById('stat-tutors-approved').textContent  = r1.count ?? '-';
  document.getElementById('stat-tutors-pending').textContent   = r2.count ?? '-';
  document.getElementById('stat-requests-pending').textContent = r3.count ?? '-';
  document.getElementById('stat-requests-matched').textContent = r4.count ?? '-';
  document.getElementById('badge-pending').textContent  = r2.count ?? 0;
  document.getElementById('badge-requests').textContent = r3.count ?? 0;
}

/* ================================================================
   튜터 승인 대기
   ================================================================ */
async function loadPendingTutors() {
  const tbody = document.getElementById('pending-tutors-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="admin-table-empty">로딩 중...</td></tr>';

  const { data, error } = await window.db
    .from('tutors').select('*').eq('is_approved', false).order('created_at', { ascending: false });

  if (error || !data?.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="admin-table-empty">대기 중인 신청이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(t => `
    <tr>
      <td><strong style="color:var(--white)">${esc(t.name)}</strong></td>
      <td style="font-size:.82rem">${esc(t.university)} · ${esc(t.grade)}</td>
      <td>${[...(t.subjects||[]),...(t.instruments||[])].map(s=>`<span class="tag tag-subject" style="font-size:.7rem">${esc(s)}</span>`).join(' ')}</td>
      <td style="font-size:.8rem">${esc(t.contact_type==='kakao'?'카카오':'전화')} · <span style="word-break:break-all">${esc(t.contact_value)}</span></td>
      <td>${t.qt_agreement ? '<span style="color:#6ee7b7;font-weight:700">✓ 동의</span>' : '<span style="color:#fca5a5">✗</span>'}</td>
      <td style="font-size:.78rem;white-space:nowrap">${fmtDate(t.created_at)}</td>
      <td style="white-space:nowrap">
        <button class="action-btn action-detail" onclick="showTutorDetail(${JSON.stringify(t).replace(/"/g,'&quot;')})">상세</button>
        <button class="action-btn action-approve" onclick="approveTutor('${t.id}', true)">승인</button>
        <button class="action-btn action-reject"  onclick="approveTutor('${t.id}', false)">반려</button>
      </td>
    </tr>
  `).join('');
}

async function approveTutor(id, approve) {
  const update = approve ? { is_approved: true } : { is_active: false };
  const { error } = await window.db.from('tutors').update(update).eq('id', id);
  if (error) { showToast('처리 중 오류가 발생했습니다.', 'error'); return; }
  showToast(approve ? '✅ 튜터를 승인했습니다.' : '✅ 신청을 반려했습니다.', 'success');
  await loadDashboardData();
  await loadPendingTutors();
}

/* ================================================================
   전체 튜터 관리
   ================================================================ */
async function loadAllTutors() {
  const tbody = document.getElementById('all-tutors-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="admin-table-empty">로딩 중...</td></tr>';

  const { data, error } = await window.db
    .from('tutors').select('*').order('created_at', { ascending: false });

  if (error) { tbody.innerHTML = '<tr><td colspan="6" class="admin-table-empty">오류 발생</td></tr>'; return; }
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="6" class="admin-table-empty">등록된 튜터가 없습니다.</td></tr>'; return; }

  tbody.innerHTML = data.map(t => `
    <tr>
      <td><strong style="color:var(--white)">${esc(t.name)}</strong></td>
      <td style="font-size:.82rem">${esc(t.university)} · ${esc(t.grade)}</td>
      <td>${[...(t.subjects||[]),...(t.instruments||[])].map(s=>`<span class="tag tag-subject" style="font-size:.7rem">${esc(s)}</span>`).join(' ')}</td>
      <td>
        ${t.is_approved
          ? `<span class="status-badge ${t.is_active ? 'status-approved' : 'status-closed'}">${t.is_active ? '활성' : '비활성'}</span>`
          : `<span class="status-badge status-pending">대기</span>`}
      </td>
      <td style="font-size:.78rem;white-space:nowrap">${fmtDate(t.created_at)}</td>
      <td style="white-space:nowrap">
        <button class="action-btn action-detail" onclick="showTutorDetail(${JSON.stringify(t).replace(/"/g,'&quot;')})">상세</button>
        ${t.is_active
          ? `<button class="action-btn action-reject" onclick="toggleTutorActive('${t.id}', false)">비활성화</button>`
          : `<button class="action-btn action-approve" onclick="toggleTutorActive('${t.id}', true)">활성화</button>`}
      </td>
    </tr>
  `).join('');

  document.getElementById('export-tutors-btn').onclick = () => exportCsv(
    data,
    ['name','university','grade','subjects','instruments','available_days','available_times','contact_type','contact_value','bio','is_approved','is_active','created_at'],
    'qt-tutors.csv'
  );
}

async function toggleTutorActive(id, active) {
  const { error } = await window.db.from('tutors').update({ is_active: active }).eq('id', id);
  if (error) { showToast('처리 중 오류가 발생했습니다.', 'error'); return; }
  showToast(`✅ 튜터를 ${active ? '활성화' : '비활성화'}했습니다.`, 'success');
  await loadAllTutors();
  await loadDashboardData();
}

/* ================================================================
   수업 신청 목록
   ================================================================ */
async function loadTuteeRequests() {
  const tbody = document.getElementById('tutee-requests-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="admin-table-empty">로딩 중...</td></tr>';

  const { data, error } = await window.db
    .from('tutee_requests')
    .select('*, tutors(name)')
    .order('created_at', { ascending: false });

  if (error) { tbody.innerHTML = '<tr><td colspan="8" class="admin-table-empty">오류 발생</td></tr>'; return; }
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="8" class="admin-table-empty">신청 목록이 없습니다.</td></tr>'; return; }

  const statusMap = { pending: '대기', matched: '매칭됨', closed: '종료' };

  tbody.innerHTML = data.map(r => `
    <tr>
      <td><strong style="color:var(--white)">${esc(r.student_name)}</strong></td>
      <td style="font-size:.82rem">${esc(r.school)} · ${esc(r.grade)}</td>
      <td>${(r.subjects||[]).map(s=>`<span class="tag tag-subject" style="font-size:.7rem">${esc(s)}</span>`).join(' ')}</td>
      <td style="font-size:.82rem">${r.tutors ? esc(r.tutors.name) : '<span style="color:rgba(255,255,255,.3)">미지정</span>'}</td>
      <td style="font-size:.8rem">${esc(r.contact_name)}<br><span style="color:rgba(255,255,255,.4);font-size:.75rem">${esc(r.contact_value)}</span></td>
      <td><span class="status-badge status-${r.status}">${statusMap[r.status]||r.status}</span></td>
      <td style="font-size:.78rem;white-space:nowrap">${fmtDate(r.created_at)}</td>
      <td style="white-space:nowrap">
        <button class="action-btn action-detail" onclick="showRequestDetail(${JSON.stringify(r).replace(/"/g,'&quot;')})">상세</button>
        ${r.status==='pending' ? `<button class="action-btn action-match" onclick="updateRequestStatus('${r.id}','matched')">매칭</button>` : ''}
        ${r.status!=='closed' ? `<button class="action-btn action-close" onclick="updateRequestStatus('${r.id}','closed')">종료</button>` : ''}
      </td>
    </tr>
  `).join('');

  document.getElementById('export-requests-btn').onclick = () => exportCsv(
    data,
    ['student_name','school','grade','subjects','preferred_days','preferred_times','contact_name','contact_type','contact_value','message','status','created_at'],
    'qt-requests.csv'
  );
}

async function updateRequestStatus(id, status) {
  const { error } = await window.db.from('tutee_requests').update({ status }).eq('id', id);
  if (error) { showToast('처리 중 오류가 발생했습니다.', 'error'); return; }
  showToast('✅ 상태가 업데이트되었습니다.', 'success');
  await loadTuteeRequests();
  await loadDashboardData();
}

/* ================================================================
   상세 모달 — 튜터 신청
   ================================================================ */
function showTutorDetail(tutor) {
  // JSON이 escaped된 경우 처리
  if (typeof tutor === 'string') {
    try { tutor = JSON.parse(tutor); } catch { return; }
  }

  document.getElementById('detail-modal-title').textContent = `📋 튜터 신청 상세 — ${tutor.name || ''}`;

  const avatarHtml = tutor.profile_image_url
    ? `<img src="${esc(tutor.profile_image_url)}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid var(--gold-400);margin-bottom:1rem">`
    : '';

  document.getElementById('detail-modal-body').innerHTML = `
    ${avatarHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
      ${df('이름',    tutor.name)}
      ${df('대학교',  `${tutor.university} · ${tutor.grade}`)}
      ${df('연락처',  `${tutor.contact_type === 'kakao' ? '카카오 오픈채팅' : '전화번호'}`)}
      ${df('연락처 값', tutor.contact_value)}
    </div>
    <div class="detail-divider"></div>
    <div class="detail-field">
      <div class="detail-field-label">가르칠 과목</div>
      <div class="detail-field-value">
        <div class="detail-tags">
          ${(tutor.subjects||[]).map(s=>`<span class="tag tag-subject">${esc(s)}</span>`).join('')}
          ${!(tutor.subjects||[]).length ? '<span style="color:rgba(255,255,255,.3)">없음</span>' : ''}
        </div>
      </div>
    </div>
    ${(tutor.instruments||[]).length ? `
    <div class="detail-field">
      <div class="detail-field-label">악기</div>
      <div class="detail-field-value">
        <div class="detail-tags">
          ${tutor.instruments.map(i=>`<span class="tag tag-instrument">🎵 ${esc(i)}</span>`).join('')}
        </div>
      </div>
    </div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
      ${df('가능 요일', (tutor.available_days||[]).join(', ') || '-')}
      ${df('가능 시간', tutor.available_times || '-')}
    </div>
    ${tutor.bio ? `<div class="detail-field">
      <div class="detail-field-label">자기소개</div>
      <div class="detail-field-value" style="white-space:pre-wrap">${esc(tutor.bio)}</div>
    </div>` : ''}
    <div class="detail-divider"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
      ${df('QT동의', tutor.qt_agreement ? '✓ 동의함' : '✗ 미동의')}
      ${df('승인 상태', tutor.is_approved ? (tutor.is_active ? '✅ 활성' : '비활성') : '⏳ 대기')}
      ${df('신청일', fmtDate(tutor.created_at))}
    </div>
  `;

  openDetailModal();
}

/* ================================================================
   상세 모달 — 수업 신청
   ================================================================ */
function showRequestDetail(req) {
  if (typeof req === 'string') {
    try { req = JSON.parse(req); } catch { return; }
  }

  const statusMap = { pending: '⏳ 대기', matched: '✅ 매칭됨', closed: '🔒 종료' };

  document.getElementById('detail-modal-title').textContent = `📋 수업 신청 상세 — ${req.student_name || ''}`;
  document.getElementById('detail-modal-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
      ${df('학생 이름', req.student_name)}
      ${df('학교',      req.school)}
      ${df('학년',      req.grade)}
      ${df('신청 상태', statusMap[req.status] || req.status)}
    </div>
    <div class="detail-divider"></div>
    <div class="detail-field">
      <div class="detail-field-label">희망 과목</div>
      <div class="detail-field-value">
        <div class="detail-tags">
          ${(req.subjects||[]).map(s=>`<span class="tag tag-subject">${esc(s)}</span>`).join('')}
          ${!(req.subjects||[]).length ? '<span style="color:rgba(255,255,255,.3)">없음</span>' : ''}
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
      ${df('희망 요일', (req.preferred_days||[]).join(', ') || '-')}
      ${df('희망 시간', req.preferred_times || '-')}
    </div>
    <div class="detail-divider"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
      ${df('연락자 이름', req.contact_name)}
      ${df('연락 방법', req.contact_type === 'kakao' ? '카카오 오픈채팅' : '전화번호')}
    </div>
    <div class="detail-field">
      <div class="detail-field-label">연락처</div>
      <div class="detail-field-value" style="word-break:break-all">${esc(req.contact_value)}</div>
    </div>
    ${req.message ? `<div class="detail-field">
      <div class="detail-field-label">추가 메시지</div>
      <div class="detail-field-value" style="white-space:pre-wrap">${esc(req.message)}</div>
    </div>` : ''}
    <div class="detail-divider"></div>
    ${df('신청일', fmtDate(req.created_at))}
  `;

  openDetailModal();
}

/** 상세 필드 헬퍼 */
function df(label, value) {
  return `<div class="detail-field">
    <div class="detail-field-label">${label}</div>
    <div class="detail-field-value">${value ?? '-'}</div>
  </div>`;
}

/* ================================================================
   상세 모달 열기/닫기
   ================================================================ */
function initDetailModal() {
  const overlay = document.getElementById('detail-modal-overlay');
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeDetailModal(); });
  document.getElementById('detail-modal-close')?.addEventListener('click', closeDetailModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetailModal(); });
}
function openDetailModal() {
  document.getElementById('detail-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDetailModal() {
  document.getElementById('detail-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ================================================================
   QT기록
   ================================================================ */
async function initQtLogPage() {
  const { data } = await window.db
    .from('tutors').select('id, name').eq('is_approved', true).eq('is_active', true);
  const select = document.getElementById('qt-tutor-select');
  select.innerHTML = '<option value="">튜터 선택</option>';
  (data || []).forEach(t => {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = t.name;
    select.appendChild(o);
  });
  document.getElementById('qt-session-date').value = new Date().toISOString().split('T')[0];

  document.getElementById('qt-log-submit-btn').onclick = async () => {
    const tutor_id     = select.value;
    const session_date = document.getElementById('qt-session-date').value;
    if (!tutor_id || !session_date) { showToast('튜터와 날짜를 선택해 주세요.', 'error'); return; }
    const note = document.getElementById('qt-note').value.trim();
    const { error } = await window.db.from('qt_log').insert([{ tutor_id, session_date, qt_done: true, note }]);
    if (error) { showToast('저장 중 오류가 발생했습니다.', 'error'); return; }
    showToast('✅ QT기록이 저장되었습니다.', 'success');
    document.getElementById('qt-note').value = '';
    await loadQtLog();
  };
  await loadQtLog();
}

async function loadQtLog() {
  const tbody = document.getElementById('qt-log-tbody');
  const { data, error } = await window.db
    .from('qt_log').select('*, tutors(name)').order('session_date', { ascending: false }).limit(50);
  if (error || !data?.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="admin-table-empty">기록이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      <td><strong style="color:var(--white)">${esc(r.tutors?.name||'-')}</strong></td>
      <td>${esc(r.session_date)}</td>
      <td><span class="status-badge status-approved">✓ 진행</span></td>
      <td style="font-size:.82rem;max-width:200px">${esc(r.note||'-')}</td>
      <td style="font-size:.78rem">${fmtDate(r.created_at)}</td>
    </tr>
  `).join('');
}

/* ================================================================
   설정 관리 (과목 / 악기 추가·삭제)
   ================================================================ */
async function loadSettings() {
  await Promise.all([
    loadSettingsCategory('subject', 'subject-list'),
    loadSettingsCategory('instrument', 'instrument-list'),
  ]);

  document.getElementById('add-subject-btn').onclick = () => addSetting('subject', 'new-subject-input');
  document.getElementById('add-instrument-btn').onclick = () => addSetting('instrument', 'new-instrument-input');

  // Enter 키 제출
  document.getElementById('new-subject-input').onkeydown = e => { if (e.key === 'Enter') addSetting('subject', 'new-subject-input'); };
  document.getElementById('new-instrument-input').onkeydown = e => { if (e.key === 'Enter') addSetting('instrument', 'new-instrument-input'); };
}

async function loadSettingsCategory(category, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '<div class="settings-loading">로딩 중...</div>';

  const { data, error } = await window.db
    .from('app_settings')
    .select('*')
    .eq('category', category)
    .order('sort_order', { ascending: true });

  if (error) { container.innerHTML = '<div class="settings-loading">오류 발생</div>'; return; }
  if (!data?.length) { container.innerHTML = '<div class="settings-empty">항목이 없습니다.</div>'; return; }

  container.innerHTML = data.map((item, i) => `
    <div class="settings-item">
      <div class="settings-item-label">
        <span class="settings-item-order">${i + 1}</span>
        <span>${esc(item.label)}</span>
        ${!item.is_active ? '<span style="font-size:.7rem;color:rgba(255,255,255,.25)">(비활성)</span>' : ''}
      </div>
      <button class="settings-delete-btn" onclick="deleteSetting('${item.id}', '${category}', '${containerId}')">삭제</button>
    </div>
  `).join('');
}

async function addSetting(category, inputId) {
  const input = document.getElementById(inputId);
  const value = input.value.trim();
  if (!value) { showToast('항목 이름을 입력해 주세요.', 'error'); return; }

  // 최대 sort_order 조회
  const { data: existing } = await window.db
    .from('app_settings').select('sort_order').eq('category', category).order('sort_order', { ascending: false }).limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { error } = await window.db.from('app_settings').insert([{
    category, value, label: value, sort_order: nextOrder
  }]);

  if (error) {
    if (error.code === '23505') { showToast('이미 존재하는 항목입니다.', 'error'); }
    else { showToast('추가 중 오류가 발생했습니다.', 'error'); }
    return;
  }

  showToast(`✅ '${value}'이(가) 추가되었습니다.`, 'success');
  input.value = '';
  const containerId = category === 'subject' ? 'subject-list' : 'instrument-list';
  await loadSettingsCategory(category, containerId);
}

async function deleteSetting(id, category, containerId) {
  if (!confirm('이 항목을 삭제하시겠습니까?\n이미 신청된 데이터에는 영향을 주지 않습니다.')) return;
  const { error } = await window.db.from('app_settings').delete().eq('id', id);
  if (error) { showToast('삭제 중 오류가 발생했습니다.', 'error'); return; }
  showToast('✅ 삭제되었습니다.', 'success');
  await loadSettingsCategory(category, containerId);
}

/* ================================================================
   CSV 내보내기
   ================================================================ */
function exportCsv(data, fields, filename) {
  const header = fields.join(',');
  const rows = data.map(row =>
    fields.map(f => {
      const val = Array.isArray(row[f]) ? row[f].join(';') : (row[f] ?? '');
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv  = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

/* ================================================================
   유틸리티
   ================================================================ */
function fmtDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icon  = type === 'success' ? '✅' : '❌';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 300); }, 4000);
}

// 전역 노출 (onclick 인라인 핸들러에서 사용)
window.approveTutor      = approveTutor;
window.toggleTutorActive = toggleTutorActive;
window.showTutorDetail   = showTutorDetail;
window.showRequestDetail = showRequestDetail;
window.updateRequestStatus = updateRequestStatus;
window.deleteSetting     = deleteSetting;
