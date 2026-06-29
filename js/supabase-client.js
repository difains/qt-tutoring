// js/supabase-client.js
// Supabase 클라이언트 초기화 (config.js 또는 GitHub Actions 생성 파일에서 키 로드)

(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error(
      '[QT터링] Supabase 설정이 없습니다. js/config.js 파일을 확인하세요.'
    );
    // 화면에 DB 오류 배너 표시
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div');
      banner.id = 'db-error-banner';
      banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
        'background:#c0392b', 'color:#fff', 'text-align:center',
        'padding:.65rem 1rem', 'font-size:.85rem', 'font-weight:600'
      ].join(';');
      banner.textContent = '⚠️ 데이터베이스 연결 오류 — 관리자에게 문의하세요 (config.js 미설정)';
      document.body.prepend(banner);
    });
    return;
  }

  const { createClient } = window.supabase;
  window.db = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  console.log('[QT터링] Supabase 연결 완료:', window.SUPABASE_URL);
})();
