import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "../index.css";

import LoginPage from "./pages/LoginPage.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import AdminPage from "./pages/AdminPage.jsx"; 

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/member/login" element={<LoginPage />} />
      <Route path="/member/signup" element={<SignupPage />} />
      <Route path="/admin" element={<AdminPage />} /> 
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);