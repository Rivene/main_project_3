import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Sidebar({
  activeTab, setActiveTab,
  categories = [], selectedCats, toggleCat,
  collapsed, setCollapsed,
}) {
  const navigate = useNavigate();

  // --- 카테고리 필터 ---
  const pureCats = useMemo(() => {
    const isCategoryLike = (s) => {
      if (!s || typeof s !== 'string') return false;
      const t = s.trim();
      if (/[[(\]]/.test(t)) return false;
      if (/\d{4,}/.test(t)) return false;
      if (/\.(pdf|hwp|hwpx|docx?)$/i.test(t)) return false;
      if (/https?:\/\//i.test(t)) return false;
      if (t.length > 24) return false;
      return true;
    };
    return Array.from(new Set(categories.filter(isCategoryLike))).slice(0, 30);
  }, [categories]);

  // --- 로그인 버튼 클릭 ---
  const goToLogin = () => {
    navigate('/member/login');
  };

  return (
    <aside className={`u-sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="전역 탐색">
      <div className="u-toprow">
        <div className="u-logo">
          <span className="u-logo-mark">📄 </span>
          <span className="u-logo-text">PDF Brief</span>
        </div>

        <button
          className="u-burger"
          type="button"
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          title={collapsed ? '펼치기' : '접기'}
          onClick={() => setCollapsed(!collapsed)}
        >
          ☰
        </button>
      </div>

      <nav className="u-nav">
        <button
          className={`u-nav-item ${activeTab === 'home' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('home')}
          aria-current={activeTab === 'home' ? 'page' : undefined}
          title="Home"
        >
          <span className="u-nav-ico">🏠</span>
          <span className="u-nav-label">Home</span>
        </button>
        <button
          className={`u-nav-item ${activeTab === 'search' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('search')}
          aria-current={activeTab === 'search' ? 'page' : undefined}
          title="Search"
        >
          <span className="u-nav-ico">🔎</span>
          <span className="u-nav-label">Search</span>
        </button>
      </nav>

      {pureCats.length > 0 && (
        <div className="u-side-cats">
          <div className="u-side-title">최근 카테고리</div>
          <div className="u-side-chipbox">
            {pureCats.map((c) => (
              <button
                key={c}
                className={`chip small ${selectedCats.has(c) ? 'chip-on' : ''}`}
                onClick={() => { setActiveTab('search'); toggleCat(c); }}
                title={c}
              >
                <span className="u-chip-text">{c}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 로그인 버튼 추가 */}
      <div className="u-bottom-section">
        <button
          className="u-login-btn"
          onClick={goToLogin}
          title="로그인 페이지로 이동"
        >
          <span className="u-login-icon">🔐</span>
          {!collapsed && <span className="u-login-text">로그인</span>}
        </button>
      </div>
    </aside>
  );
}