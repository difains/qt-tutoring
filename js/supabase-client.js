// js/supabase-client.js
// Supabase 클라이언트 초기화 (config.js 또는 GitHub Actions 생성 파일에서 키 로드)

(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error(
      '[QT터링] Supabase 설정이 없습니다. js/config.js 파일을 확인하세요.'
    );
    return;
  }

  const { createClient } = window.supabase;
  window.db = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
})();
