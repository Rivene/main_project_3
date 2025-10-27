import React from "react";
import { useNavigate } from "react-router-dom";

export default function AdminSidebar({ activeMenu, setActiveMenu }) {
  const navigate = useNavigate();

  const menus = [
    { key: "dashboard", label: "대시보드" },
    { key: "users", label: "회원 관리" },
    { key: "files", label: "업로드 파일 관리" },
  ];

  return (
    <aside className="w-[220px] min-h-screen bg-white border-r border-gray-300 flex flex-col">
      {/* 로고만 */}
      <div className="flex items-center justify-start px-4 py-4 border-b border-gray-300">
        <img
          src="/image/main로고.png"
          alt="SumFlow"
          className="w-[140px] h-auto object-contain"
        />
      </div>

      {/* 메뉴 리스트 */}
      <nav className="flex flex-col flex-1 text-[14px] leading-tight font-medium text-gray-800">
        {menus.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveMenu(m.key)}
            className={`w-full text-left px-4 py-3 border-b border-gray-200 ${
              activeMenu === m.key
                ? "bg-[#ff4fa0] text-white"
                : "hover:bg-gray-100"
            }`}
          >
            {m.label}
          </button>
        ))}
      </nav>

      {/* 하단 액션 영역 */}
      <div className="border-t border-gray-300 flex flex-col">
        {/* 홈으로 (사이트 메인 / 업로드 페이지로 이동) */}
        <button
          onClick={() => navigate("/")}
          className="w-full text-left px-4 py-3 text-[13px] hover:bg-gray-100"
        >
          홈으로
        </button>
      </div>
    </aside>
  );
}