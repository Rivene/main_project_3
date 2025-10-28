// App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminPage from "./pages/AdminPage";

// ✅ 로그인 보호용 컴포넌트
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token"); // 로그인 시 저장된 JWT
  if (!token) {
    alert("로그인이 필요합니다.");
    return <Navigate to="/member/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 로그인 & 회원가입 */}
        <Route path="/member/login" element={<LoginPage />} />
        <Route path="/member/signup" element={<SignupPage />} />

        {/* 메인 업로드 페이지 (로그인 필요) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />

        {/* 관리자 페이지 (로그인 필요) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* 예외 라우트 → 홈으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
