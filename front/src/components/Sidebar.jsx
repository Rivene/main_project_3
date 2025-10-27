import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

/**
 * props
 * - activeTab: 'home' | 'mypage' | 'admin'
 * - setActiveTab(tab)
 * - categories: string[]
 * - selectedCats: Set<string>
 * - toggleCat(cat)
 * - collapsed: boolean
 * - setCollapsed(fn)
 * - isLoggedIn: boolean
 * - userNickname: string
 * - onLogout(): void
 */
export default function Sidebar({
  activeTab,
  setActiveTab,
  categories = [],
  selectedCats,
  toggleCat,
  collapsed,
  setCollapsed,
  isLoggedIn = false,
  userNickname = "사용자",
  onLogout,
}) {
  const navigate = useNavigate();

  // 카테고리 후보 필터링
  const pureCats = useMemo(() => {
    const isCategoryLike = (s) => {
      if (!s || typeof s !== "string") return false;
      const t = s.trim();
      if (/[[(\]]/.test(t)) return false;
      if (/\d{4,}/.test(t)) return false;
      if (/\.(pdf|hwp|hwpx|docx?)$/i.test(t)) return false;
      if (/https?:\/\//i.test(t)) return false;
      if (t.length > 24) return false;
      return true;
    };
    return Array.from(new Set(categories.filter(isCategoryLike))).slice(
      0,
      30
    );
  }, [categories]);

  const goToLogin = () => {
    navigate("/member/login");
  };

  const handleLogout = () => {
    onLogout?.();
    navigate("/");
  };

  // 공통 버튼 스타일
  const navBtnBase =
    "grid grid-cols-[28px_1fr] items-center gap-2 w-full text-left rounded-xl border border-transparent px-3 py-2 text-[14px] font-medium cursor-pointer transition-colors";
  const navBtnActive =
    "bg-[rgba(110,168,254,0.15)] border-[rgba(110,168,254,0.4)] text-gray-900";
  const navBtnHover =
    "hover:bg-gray-100 hover:text-gray-900 text-gray-700";

  return (
    <aside
      aria-label="사이드바"
      className={`
        flex flex-col bg-white text-gray-900 border-r border-gray-200
        h-screen sticky top-0 overflow-hidden
        transition-[width,padding] duration-200
        ${collapsed ? "w-[72px] px-4 py-4" : "w-[240px] px-4 py-4"}
      `}
    >
      {/* 상단: 로고 / 토글 */}
      <div
        className={`
          flex items-center justify-between mb-4
          ${collapsed ? "justify-center" : "justify-between"}
        `}
      >
        {/* 펼쳐졌을 때: 로고 + 버튼 */}
        {!collapsed && (
          <>
            {/* 로고 영역 */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {
                setActiveTab("home");
                navigate("/");
              }}
            >
              <img
                src="/image/main로고.png"
                alt="logo"
                className="object-contain w-[150px] h-[80px]"
              />
            </div>

            {/* 접기 버튼 */}
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="w-9 h-9 rounded-lg border border-gray-300 bg-white
                        text-gray-700 grid place-items-center text-sm
                        hover:bg-gray-100"
              aria-label="사이드바 접기"
              title="접기"
            >
              ☰
            </button>
          </>
        )}

        {/* 접혔을 때: ☰ 버튼만 중앙 정렬 */}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="w-10 h-10 rounded-lg border border-gray-300 bg-white
                      text-gray-700 grid place-items-center text-base
                      hover:bg-gray-100 shadow-sm"
            aria-label="사이드바 펼치기"
            title="펼치기"
          >
            ☰
          </button>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="grid gap-2">
        {/* 홈 */}
        <button
          onClick={() => setActiveTab("home")}
          aria-current={activeTab === "home" ? "page" : undefined}
          className={`${navBtnBase} ${
            activeTab === "home" ? navBtnActive : navBtnHover
          }`}
          title="홈"
        >
          {/* 아이콘 크게 */}
          <span className="w-[28px] text-center text-[20px] leading-none">
            🏠
          </span>
          {!collapsed && (
            <span className="whitespace-nowrap text-[14px]">홈</span>
          )}
        </button>

        {/* 마이페이지 */}
        <button
          onClick={() => setActiveTab("mypage")}
          aria-current={activeTab === "mypage" ? "page" : undefined}
          className={`${navBtnBase} ${
            activeTab === "mypage" ? navBtnActive : navBtnHover
          }`}
          title="마이페이지"
        >
          <span className="w-[28px] text-center text-[20px] leading-none">
            📂
          </span>
          {!collapsed && (
            <span className="whitespace-nowrap text-[14px]">
              마이페이지
            </span>
          )}
        </button>

        {/* 관리자 페이지 (지금은 테스트니까 항상 보이게) */}
        <button
          onClick={() => {
            navigate("/admin");
          }}
          aria-current={activeTab === "admin" ? "page" : undefined}
          className={`${navBtnBase} ${
            activeTab === "admin" ? navBtnActive : navBtnHover
          }`}
          title="관리자 페이지"
        >
          <span className="w-[28px] text-center text-[20px] leading-none">
            🛠
          </span>
          {!collapsed && (
            <span className="whitespace-nowrap text-[14px]">
              관리자 페이지
            </span>
          )}
        </button>
      </nav>

      {/* 최근 카테고리 */}
      {pureCats.length > 0 && (
        <div className="mt-4">
          {!collapsed && (
            <div className="text-[12px] text-gray-500 mb-2">
              최근 카테고리
            </div>
          )}

          <div
            className={`flex flex-wrap gap-1.5 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {pureCats.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setActiveTab("mypage");
                  toggleCat(c);
                }}
                title={c}
                className={`
                  rounded-lg border text-[11px] font-medium leading-none
                  px-2 py-1
                  ${
                    selectedCats.has(c)
                      ? "bg-blue-100 border-blue-300 text-blue-700"
                      : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                  }
                  ${
                    collapsed
                      ? "w-8 h-8 flex items-center justify-center px-0"
                      : ""
                  }
                `}
              >
                {collapsed ? (
                  <span className="truncate max-w-[20px]">
                    {c.slice(0, 2)}
                  </span>
                ) : (
                  <span className="whitespace-nowrap">{c}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 하단 프로필 / 로그인 */}
      <div className="mt-auto pt-4">
        {!isLoggedIn ? (
          // 로그인 안 된 상태
          <button
            onClick={goToLogin}
            title="로그인 페이지로 이동"
            className={`
              w-full flex items-center justify-center gap-2
              text-white font-semibold text-[14px]
              rounded-lg
              px-3 py-2
              bg-gradient-to-r from-[#FF54A1] to-[#B862FF]
              hover:opacity-90
              transition-opacity
            `}
          >
            <span className="text-[18px] leading-none">🔐</span>
            {!collapsed && <span>로그인</span>}
          </button>
        ) : (
          // 로그인 된 상태
          <div
            className={`
              flex flex-col items-stretch
              rounded-xl border border-gray-200 bg-white
              p-3 text-[13px] text-gray-900 shadow-sm
            `}
          >
            {/* 닉네임 영역 */}
            <div className="flex items-center gap-2 mb-2">
              {/* 이니셜 박스 */}
              <div className="w-9 h-9 rounded-lg bg-gray-200 text-gray-800 flex items-center justify-center text-sm font-bold">
                {userNickname ? userNickname.slice(0, 2) : "유저"}
              </div>

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-tight truncate text-[13px] text-gray-900">
                    {userNickname || "사용자"}
                  </div>
                  <div className="text-[11px] text-gray-500 leading-tight">
                    {/* 테스트니까 그냥 관리자라고 써줌 */}
                    관리자
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={handleLogout}
                className={`
                  px-3 py-2 rounded-lg text-white text-sm font-semibold bg-gradient-to-r from-[#FF54A1] to-[#B862FF] hover:opacity-90
                `}
              >
                로그아웃
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}