import React, { useState, useEffect } from "react";

export default function ProfileEditModal({ isOpen, onClose, user, onSave }) {
  const [form, setForm] = useState({
    nickname: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (user && isOpen) {
      setForm({
        nickname: user.nickname || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    }
  }, [user, isOpen]);

  const handleChange = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* 모달 박스 */}
      <div
        className="bg-white rounded-2xl shadow-lg w-[400px] max-w-[90%] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          프로필 편집
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 닉네임 */}
          <div>
            <label className="text-sm font-medium text-gray-700">닉네임</label>
            <input
              type="text"
              value={form.nickname}
              onChange={(e) => handleChange("nickname", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="닉네임을 입력하세요"
            />
          </div>

          {/* 전화번호 */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              전화번호
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="010-1234-5678"
            />
          </div>

          {/* 이메일 */}
          <div>
            <label className="text-sm font-medium text-gray-700">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="example@email.com"
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-3 py-2 text-sm rounded-lg text-white font-medium bg-gradient-to-r from-[#FF54A1] to-[#B862FF] hover:opacity-90"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}