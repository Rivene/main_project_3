import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "../index.css"; 

import UploadHome from "./components/UploadHome.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      {/* 루트('/')*/}
      <Route path="/" element={<UploadPage />} />

      {/* 로그인 페이지 */}
      <Route path="/member/login" element={<LoginPage />} />

      {/* 회원가입 페이지 */}
      <Route path="/member/signup" element={<SignupPage />} />

      {/* 그 외 경로 → / 로 리다이렉트 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);