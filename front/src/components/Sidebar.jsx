export default function Sidebar({
  activeTab, setActiveTab,
  categories, selectedCats, toggleCat,
  collapsed, setCollapsed, 
}) {
  return (
    <aside className={`u-sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="전역 탐색">
      <div className="u-toprow">
        <div className="u-logo">
          <span className="u-logo-mark">📄 </span>
          {/* 접힘 시 텍스트 숨김 */}
          <span className="u-logo-text">PDF Brief</span>
        </div>

        {/*  삼지창(햄버거) 버튼 */}
        <button
          className="u-burger"
          type="button"
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          title={collapsed ? '펼치기' : '접기'}
          onClick={() => setCollapsed(!collapsed)}
        >
          {/* 삼지창 모양: ☰ (또는 ≡) */}
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

      {categories.length > 0 && (
        <div className="u-side-cats">
          <div className="u-side-title">카테고리</div>
          <div className="u-side-chipbox">
            {categories.map((c) => (
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
    </aside>
  );
}