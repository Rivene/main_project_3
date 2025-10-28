import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import AdminSidebar from "../components/AdminSidebar";
import AdminDashboardMain from "../components/admin/AdminDashboardMain";
import AdminUserManage from "../components/admin/AdminUserManage";
import AdminFileManage from "../components/admin/AdminFileManage";

export default function AdminPage() {
  const [activeMenu, setActiveMenu] = useState("dashboard"); // "dashboard" | "users" | "files"
  const navigate = useNavigate();

  // 간이 접근 제어
//   useEffect(() => {
//     const isAdmin = sessionStorage.getItem("isAdmin") === "true";
//     if (!isAdmin) {
//       alert("관리자만 접근 가능합니다.");
//       navigate("/");
//     }
//   }, [navigate]);

  return (
    <div className="flex min-h-screen">
      {/* 왼쪽 사이드바 */}
      <AdminSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      {/* 오른쪽 영역 */}
      <main
        className="flex-1 p-8 overflow-auto"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(64,0,64,0.6) 0%, rgba(38,20,53,1) 40%, rgba(143,39,78,1) 70%, rgba(189,68,83,1) 100%)",
        }}
      >
        {activeMenu === "dashboard" && <AdminDashboardMain />}
        {activeMenu === "users" && <AdminUserManage />}
        {activeMenu === "files" && <AdminFileManage />}
      </main>
    </div>
  );
}