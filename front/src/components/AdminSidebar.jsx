import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, Users, FileText, LayoutDashboard } from "lucide-react";

export default function AdminSidebar({ activeMenu, setActiveMenu }) {
  const navigate = useNavigate();

  const menus = [
    { key: "dashboard", label: "대시보드", icon: <LayoutDashboard size={18} /> },
    { key: "users", label: "회원 관리", icon: <Users size={18} /> },
    { key: "files", label: "파일 관리", icon: <FileText size={18} /> },
  ];

  return (
    <aside
      className={`
        flex flex-col min-h-screen w-[240px]
        bg-white text-gray-800 border-r border-gray-200
        shadow-[2px_0_10px_rgba(0,0,0,0.05)]
      `}
    >
      {/* 상단 로고 */}
      <div className="flex items-center justify-center py-5 border-b border-gray-200">
        <img
          src="/image/main로고.png"
          alt="SumFlow"
          className="w-[140px] h-auto object-contain"
        />
      </div>

      {/* 메뉴 리스트 */}
      <nav className="flex flex-col gap-2 px-3 mt-6 text-[14px] font-medium">
        {menus.map((m) => {
          const isActive = activeMenu === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setActiveMenu(m.key)}
              className={`
                group w-full text-left grid grid-cols-[24px_1fr] items-center gap-3
                px-4 py-2.5 rounded-lg border transition
                ${
                  isActive
                    ? "bg-gradient-to-r from-[#FF54A1] to-[#B862FF] text-white border-transparent shadow-md"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                }
              `}
            >
              {/* 아이콘 */}
              <span
                className={`w-5 h-5 flex items-center justify-center ${
                  isActive
                    ? "text-white"
                    : "text-gray-500 group-hover:text-[#B862FF]"
                }`}
              >
                {m.icon}
              </span>
              <span
                className={`whitespace-nowrap ${
                  isActive ? "text-white" : "text-gray-800"
                }`}
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 하단 버튼 */}
      <div className="mt-auto w-full px-4 pb-5 pt-6 border-t border-gray-200">
        <button
          onClick={() => navigate("/")}
          className={`
            w-full flex items-center justify-center gap-2
            text-[13px] font-semibold leading-none
            rounded-lg px-3 py-2.5
            text-white
            bg-gradient-to-r from-[#FF54A1] to-[#B862FF]
            shadow-[0_4px_10px_rgba(184,98,255,0.3)]
            hover:opacity-90 transition
          `}
        >
          <Home size={16} />
          <span>홈으로</span>
        </button>
      </div>
    </aside>
  );
}