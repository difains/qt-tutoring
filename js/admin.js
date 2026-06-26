// js/admin.js — QT터링 관리자 패널 로직

let currentUser = null;
let allTutorsAdmin = [];
let allRequests = [];

/* ================================================================
   초기화
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNavigation();
});

/* ================================================================
   인증 (Supabase Auth)
   ================================================================ */
async function initAuth() {
  if (!window.db) {
    showLoginError('데이터베이스 연결 설정이 필요합니다.');
    return;
  }

  // 기존 세션 확인
  const { data: { session } } = await window.db.auth.getSession();
  if (session) {
    currentUser = session.user;
    showDashboard();
  }

  // 상태 변화 감지
  window.db.auth.onAuthStateChange((_event, session) => {
    if (session) {
      currentUser = session.user;
      showDashboard();
    } else {
      currentUser = null;
      showLoginScreen();
    }
  });

  // 로그인 폼
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const btn = document.getElementById('login-btn');

    if (!email || !password) {
      showLoginError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> 로그인 중...';

    const { error } = await window.db.auth.signInWithPassword({ email, password });
    if (error) {
      showLoginError('이메일 또는 비밀번호가 올바르지 않습니다.');
      btn.disabled = false;
      btn.innerHTML = '로그인';
    }
  });

  // 로그아웃
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await window.db.auth.signOut();
  });
}

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-dashboard').style.display = 'none';
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.classList.add('show');
}

async function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'flex';
  await loadDashboardData();
}

/* ================================================================
   사이드바 네비게이션
   ================================================================ */
function initNavigation() {
  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    link.addEventListener('click', () => {
      const page = link.dataset.page;
      // 링크 활성화
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      // 페이지 전환
      document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${page}`)?.classList.add('active');
      // 각 페이지 로드
      if (page === 'tutors-pending') loadPendingTutors();
      if (page === 'tutors-all') loadAllTutors();
      if (page === 'tutee-requests') loadTuteeRequests();
      if (page === 'qt-log') initQtLogPage();
    });
  });
}

/* ================================================================
   대시보드 통계
   ================================================================ */
async function loadDashboardData() {
  if (!window.db) return;
  const [approvedRes, pendingRes, requestsPendingRes, requestsMatchedRes] = await Promise.all([
    window.db.from('tutors').select('id', { count: 'exact', head: true }).eq('is_approved', true),
    window.db.from('tutors').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    window.db.from('tutee_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    window.db.from('tutee_requests').select('id', { count: 'exact', head: true }).eq('status', 'matched'),
  ]);

  document.getElementById('stat-tutors-approved').textContent = approvedRes.count ?? '-';
  document.getElementById('stat-tutors-pending').textContent = pendingRes.count ?? '-';
  document.getElementById('stat-requests-pending').textContent = requestsPendingRes.count ?? '-';
  document.getElementById('stat-requests-matched').textContent = requestsMatchedRes.count ?? '-';

  // 배지 업데이트
  document.getElementById('badge-pending').textContent = pendingRes.count ?? 0;
  document.getElementById('badge-requests').textContent = requestsPendingRes.count ?? 0;
}

/* ================================================================
   튜터 승인 대기
   ================================================================ */
async function loadPendingTutors() {
  const tbody = document.getElementById('pending-tutors-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:rgba(255,255,255,.3)">로딩 중...</td></tr>';

  const { data, error } = await window.db
    .from('tutors')
    .select('*')
    .eq('is_approved', false)
    .order('created_at', { ascending: false });

  if (error || !data?.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:rgba(255,255,255,.3)">대기 중인 신청이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(t => `
    <tr>
      <td><strong style="color:var(--white)">${escHtml(t.name)}</strong></td>
      <td>${escHtml(t.university)} · ${escHtml(t.grade)}</td>
      <td>${[...(t.subjects || []), ...(t.instruments || [])].map(s => `<span class="tag tag-subject" style="font-size:.72rem">${escHtml(s)}</span>`).join(' ')}</td>
      <td style="font-size:.8rem">${escHtml(t.contact_type === 'kakao' ? '카카오' : '전화')} · ${escHtml(t.contact_value)}</td>
      <td style="font-size:.8rem">${formatDate(t.created_at)}</td>
      <td>${t.qt_agreement ? '<span style="color:#6ee7b7">✓ 동의</span>' : '<span style="color:#fca5a5">✗</span>'}</td>
      <td style="white-space:nowrap">
        <button class="action-btn action-approve" onclick="approveTutor('${t.id}', true)">승인</button>
        <button class="action-btn action-reject" style="margin-left:.3rem" onclick="approveTutor('${t.id}', false)">반려</button>
      </td>
    </tr>
  `).join('');
}

async function approveTutor(id, approve) {
  const { error } = await window.db
    .from('tutors')
    .update(approve ? { is_approved: true } : { is_active: false })
    .eq('id', id);

  if (error) { showToast('처리 중 오류가 발생했습니다.', 'error'); return; }
  showToast(approve ? '✅ 튜터를 승인했습니다.' : '✅ 신청을 반려했습니다.', 'success');
  await loadDashboardData();
  await loadPendingTutors();
}

/* ================================================================
   전체 튜터
   ================================================================ */
async function loadAllTutors() {
  const tbody = document.getElementById('all-tutors-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:rgba(255,255,255,.3)">로딩 중...</td></tr>';

  const { data, error } = await window.db
    .from('tutors')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:rgba(255,255,255,.3)">오류 발생</td></tr>'; return; }
  allTutorsAdmin = data || [];

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:rgba(255,255,255,.3)">등록된 튜터가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(t => `
    <tr>
      <td><strong style="color:var(--white)">${escHtml(t.name)}</strong></td>
      <td>${escHtml(t.university)} · ${escHtml(t.grade)}</td>
      <td>${[...(t.subjects || []), ...(t.instruments || [])].map(s => `<span class="tag tag-subject" style="font-size:.72rem">${escHtml(s)}</span>`).join(' ')}</td>
      <td>
        ${t.is_approved
          ? `<span class="status-badge status-approved">${t.is_active ? '활성' : '비활성'}</span>`
          : `<span class="status-badge status-pending">대기</span>`}
      </td>
      <td style="font-size:.8rem">${formatDate(t.created_at)}</td>
      <td style="white-space:nowrap">
        ${t.is_active
          ? `<button class="action-btn action-reject" onclick="toggleTutorActive('${t.id}', false)">비활성화</button>`
          : `<button class="action-btn action-approve" onclick="toggleTutorActive('${t.id}', true)">활성화</button>`}
      </td>
    </tr>
  `).join('');

  // CSV 내보내기
  document.getElementById('export-tutors-btn').onclick = () => exportCsv(
    data,
    ['name', 'university', 'grade', 'subjects', 'instruments', 'available_days', 'available_times', 'contact_type', 'contact_value', 'is_approved', 'created_at'],
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
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:rgba(255,255,255,.3)">로딩 중...</td></tr>';

  const { data, error } = await window.db
    .from('tutee_requests')
    .select('*, tutors(name)')
    .order('created_at', { ascending: false });

  if (error) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:rgba(255,255,255,.3)">오류 발생</td></tr>'; return; }
  allRequests = data || [];

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:rgba(255,255,255,.3)">신청 목록이 없습니다.</td></tr>';
    return;
  }

  const statusMap = { pending: '대기', matched: '매칭됨', closed: '종료' };

  tbody.innerHTML = data.map(r => `
    <tr>
      <td><strong style="color:var(--white)">${escHtml(r.student_name)}</strong></td>
      <td>${escHtml(r.school)} · ${escHtml(r.grade)}</td>
      <td>${(r.subjects || []).map(s => `<span class="tag tag-subject" style="font-size:.72rem">${escHtml(s)}</span>`).join(' ')}</td>
      <td style="font-size:.82rem">${r.tutors ? escHtml(r.tutors.name) : '-'}</td>
      <td style="font-size:.8rem">${escHtml(r.contact_name)} · ${escHtml(r.contact_value)}</td>
      <td><span class="status-badge status-${r.status}">${statusMap[r.status] || r.status}</span></td>
      <td style="font-size:.8rem">${formatDate(r.created_at)}</td>
      <td style="white-space:nowrap">
        ${r.status === 'pending' ? `<button class="action-btn action-match" onclick="updateRequestStatus('${r.id}','matched')">매칭</button>` : ''}
        ${r.status !== 'closed' ? `<button class="action-btn action-close" style="margin-left:.25rem" onclick="updateRequestStatus('${r.id}','closed')">종료</button>` : ''}
      </td>
    </tr>
  `).join('');

  // CSV 내보내기
  document.getElementById('export-requests-btn').onclick = () => exportCsv(
    data,
    ['student_name', 'school', 'grade', 'subjects', 'preferred_days', 'preferred_times', 'contact_name', 'contact_type', 'contact_value', 'message', 'status', 'created_at'],
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
   QT 기록
   ================================================================ */
async function initQtLogPage() {
  // 튜터 선택 옵션
  const { data } = await window.db.from('tutors').select('id, name').eq('is_approved', true).eq('is_active', true);
  const select = document.getElementById('qt-tutor-select');
  select.innerHTML = '<option value="">튜터 선택</option>';
  (data || []).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  });

  // 오늘 날짜 기본값
  document.getElementById('qt-session-date').value = new Date().toISOString().split('T')[0];

  // 저장 버튼
  document.getElementById('qt-log-submit-btn').onclick = async () => {
    const tutor_id = select.value;
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
    .from('qt_log')
    .select('*, tutors(name)')
    .order('session_date', { ascending: false })
    .limit(50);

  if (error || !data?.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:rgba(255,255,255,.3)">기록이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(r => `
    <tr>
      <td><strong style="color:var(--white)">${escHtml(r.tutors?.name || '-')}</strong></td>
      <td>${escHtml(r.session_date)}</td>
      <td><span class="status-badge status-approved">✓ 진행</span></td>
      <td style="font-size:.83rem;max-width:200px">${escHtml(r.note || '-')}</td>
      <td style="font-size:.78rem">${formatDate(r.created_at)}</td>
    </tr>
  `).join('');
}

/* ================================================================
   유틸리티
   ================================================================ */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function exportCsv(data, fields, filename) {
  const header = fields.join(',');
  const rows = data.map(row =>
    fields.map(f => {
      const val = Array.isArray(row[f]) ? row[f].join(';') : (row[f] ?? '');
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icon = type === 'success' ? '✅' : '❌';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 300); }, 4000);
}
