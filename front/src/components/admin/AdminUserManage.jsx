import React, { useState, useMemo } from "react";

export default function AdminUserManage() {
  // 검색 상태
  const [searchType, setSearchType] = useState("nickname"); // 'nickname' | 'email'
  const [keyword, setKeyword] = useState("");

  // 실제 검색 실행된 키워드 (검색 버튼/엔터 시 반영)
  const [searchTerm, setSearchTerm] = useState("");

  // 가입 상태 필터
  const [userFilter, setUserFilter] = useState("all"); // 'all' | 'active' | 'withdrawn'

  // 현재 페이지 (1부터 시작)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20; // 한 페이지에서 좌10+우10

  // 나중에 실제로는 백엔드에서 최초 1회 받아오는 전체 목록
  const allUsers = [
    { id: 1, nickname: "김현우", email: "makim9@kh.or.kr", status: "가입" },
    { id: 2, nickname: "최나연", email: "nkoim@kh.or.kr", status: "탈퇴" },
    { id: 3, nickname: "황민지", email: "kingmin@kh.or.kr", status: "가입" },
    { id: 4, nickname: "박수현", email: "psuh@kh.or.kr", status: "가입" },
    { id: 5, nickname: "정호연", email: "jhy@kh.or.kr", status: "가입" },
    { id: 6, nickname: "이가영", email: "gy_lee@kh.or.kr", status: "탈퇴" },
    { id: 7, nickname: "오지민", email: "jm_oh@kh.or.kr", status: "가입" },
    { id: 8, nickname: "홍길동", email: "hong@kh.or.kr", status: "가입" },
    { id: 9, nickname: "송지훈", email: "song@kh.or.kr", status: "가입" },
    { id: 10, nickname: "류가온", email: "gaon@kh.or.kr", status: "가입" },
    { id: 11, nickname: "유세연", email: "seyeon@kh.or.kr", status: "가입" },
    { id: 12, nickname: "강주호", email: "juho@kh.or.kr", status: "가입" },
    { id: 13, nickname: "이다연", email: "dy_lee@kh.or.kr", status: "탈퇴" },
    { id: 14, nickname: "박지수", email: "jisoo@kh.or.kr", status: "가입" },
    { id: 15, nickname: "채다원", email: "dawon@kh.or.kr", status: "가입" },
    { id: 16, nickname: "전하람", email: "hr_j@kh.or.kr", status: "가입" },
    { id: 17, nickname: "이유리", email: "yuri@kh.or.kr", status: "가입" },
    { id: 18, nickname: "임지우", email: "jiwoo@kh.or.kr", status: "가입" },
    { id: 19, nickname: "최수현", email: "shchoi@kh.or.kr", status: "탈퇴" },
    { id: 20, nickname: "한나율", email: "nayul@kh.or.kr", status: "가입" },
    { id: 21, nickname: "한나율", email: "nayul@kh.or.kr", status: "가입" },
    { id: 22, nickname: "한나율", email: "nayul@kh.or.kr", status: "가입" },
    { id: 23, nickname: "한나율", email: "nayul@kh.or.kr", status: "가입" },
    { id: 24, nickname: "한나율", email: "nayul@kh.or.kr", status: "가입" },
    // 여기에 21, 22, ... 더 추가되면 페이지네이션 "다음"이 살아나.
  ];

  // 1단계: 상태 필터 (전체/가입/탈퇴)
  const filteredByStatus = useMemo(() => {
    return allUsers.filter((u) => {
      if (userFilter === "active") return u.status === "가입";
      if (userFilter === "withdrawn") return u.status === "탈퇴";
      return true;
    });
  }, [allUsers, userFilter]);

  // 2단계: 검색 필터 (닉네임 / 이메일)
  const filtered = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    if (!kw) return filteredByStatus;
    return filteredByStatus.filter((u) => {
      if (searchType === "nickname") {
        return u.nickname.toLowerCase().includes(kw);
      } else {
        return u.email.toLowerCase().includes(kw);
      }
    });
  }, [filteredByStatus, searchTerm, searchType]);

  // 전체 페이지 수
  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  // 현재 페이지 범위 slice
  const startIdx = (page - 1) * PAGE_SIZE;
  const currentPageSlice = filtered.slice(
    startIdx,
    startIdx + PAGE_SIZE
  );

  // 좌우 테이블 분리 (최대 각각 10명)
  const leftCol = currentPageSlice.slice(0, 10);
  const rightCol = currentPageSlice.slice(10, 20);

  // 검색 실행 함수 (버튼 or Enter)
  const handleSearch = () => {
    setSearchTerm(keyword); // 입력된 keyword를 실제 검색어로 반영
    setPage(1); // 검색 시 1페이지로 이동
  };

  // Enter키 감지 핸들러
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 필터 변경 시 페이지 초기화
  const handleStatusChange = (mode) => {
    setUserFilter(mode);
    setPage(1);
  };


  return (
    <section className="max-w-[1100px] mx-auto text-[13px] text-black">
      {/* 상단: 회원 관리 + 검색 */}
      <div className="bg-white border border-gray-300 rounded-lg p-4 flex flex-col gap-4 mb-6 shadow-sm">
        <div className="text-[15px] font-semibold text-gray-800">
          회원 관리
        </div>

        {/* 검색 박스 */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            {/* 검색 기준 */}
            <div className="flex flex-col">
              <label className="text-[12px] text-gray-600 mb-1">
                검색 기준
              </label>
              <select
                className="border border-gray-400 rounded px-2 py-1 text-[12px] outline-none bg-white"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
              >
                <option value="nickname">닉네임</option>
                <option value="email">이메일</option>
              </select>
            </div>

            {/* 검색어 */}
            <div className="flex-1 flex flex-col">
              <label className="text-[12px] text-gray-600 mb-1">
                검색어
              </label>
              <input
                className="border border-gray-400 rounded px-2 py-1 text-[12px] outline-none"
                placeholder={
                  searchType === "nickname"
                    ? "닉네임을 입력하세요"
                    : "이메일을 입력하세요"
                }
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* 검색 버튼 */}
            <div className="flex flex-col">
              <label className="text-[12px] text-gray-600 mb-1 opacity-0 select-none">
                버튼
              </label>
              <button
                onClick={handleSearch}
                className="
                  inline-flex items-center justify-center
                  rounded-md border border-[#B862FF]
                  bg-gradient-to-r from-[#FF54A1] to-[#B862FF]
                  text-white text-[12px] font-semibold
                  px-3 py-2
                  hover:opacity-90
                  shadow-[0_4px_10px_rgba(184,98,255,0.3)]
                "
              >
                검색
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 아래 카드: 필터/통계/리스트 */}
      <div className="bg-white rounded-lg shadow-md border border-gray-300 p-4">
        {/* 상단 라인: 고객 규모 + 상태 필터 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="text-[14px] font-semibold text-gray-800">
            고객 규모(인원)
          </div>

          <div className="flex gap-2 text-[12px] font-medium">
            <button
              onClick={() => handleStatusChange("all")}
              className={`
                rounded-md border px-3 py-1.5 transition
                ${
                  userFilter === "all"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }
              `}
            >
              전체
            </button>

            <button
              onClick={() => handleStatusChange("active")}
              className={`
                rounded-md border px-3 py-1.5 transition
                ${
                  userFilter === "active"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }
              `}
            >
              가입
            </button>

            <button
              onClick={() => handleStatusChange("withdrawn")}
              className={`
                rounded-md border px-3 py-1.5 transition
                ${
                  userFilter === "withdrawn"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }
              `}
            >
              탈퇴
            </button>
          </div>
        </div>

        {/* 수치 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-[12px] text-gray-800">
          <div className="rounded-md border border-gray-300 bg-gray-50 p-3 flex flex-col">
            <div className="text-[12px] text-gray-600">총 회원 수</div>
            <div className="text-[20px] font-bold text-gray-900 leading-none">
              {allUsers.length}
            </div>
          </div>

          <div className="rounded-md border border-gray-300 bg-gray-50 p-3 flex flex-col">
            <div className="text-[12px] text-gray-600">현재 회원 수</div>
            <div className="text-[20px] font-bold text-gray-900 leading-none">
              {allUsers.filter((u) => u.status === "가입").length}
            </div>
          </div>

          <div className="rounded-md border border-gray-300 bg-gray-50 p-3 flex flex-col">
            <div className="text-[12px] text-gray-600">탈퇴 회원 수</div>
            <div className="text-[20px] font-bold text-gray-900 leading-none">
              {allUsers.filter((u) => u.status === "탈퇴").length}
            </div>
          </div>

          <div className="rounded-md border border-gray-300 bg-gray-50 p-3 flex flex-col">
            <div className="text-[12px] text-gray-600">신규 가입 수</div>
            <div className="text-[20px] font-bold text-gray-900 leading-none">
              3
            </div>
          </div>
        </div>

        {/* 회원 리스트 */}
        <div className="text-[12px] text-gray-800">
          <div className="font-medium mb-2 text-[13px] text-gray-900">
            회원 리스트 (최신등록순)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LEFT TABLE */}
            <div className="overflow-x-auto border border-gray-400 rounded-md">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[#efefef] border-b border-gray-400">
                  <tr>
                    <th className="border-r border-gray-400 px-2 py-1">
                      회원 번호
                    </th>
                    <th className="border-r border-gray-400 px-2 py-1">
                      닉네임
                    </th>
                    <th className="border-r border-gray-400 px-2 py-1">
                      이메일
                    </th>
                    <th className="px-2 py-1">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {leftCol.map((u) => (
                    <tr
                      key={`left-${u.id}`}
                      className="border-t border-gray-300 hover:bg-gray-50"
                    >
                      <td className="border-r border-gray-300 px-2 py-1">
                        {u.id}
                      </td>
                      <td className="border-r border-gray-300 px-2 py-1">
                        {u.nickname}
                      </td>
                      <td className="border-r border-gray-300 px-2 py-1">
                        {u.email}
                      </td>
                      <td
                        className={`px-2 py-1 font-semibold ${
                          u.status === "가입"
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        {u.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* RIGHT TABLE */}
            <div className="overflow-x-auto border border-gray-400 rounded-md">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[#efefef] border-b border-gray-400">
                  <tr>
                    <th className="border-r border-gray-400 px-2 py-1">
                      회원 번호
                    </th>
                    <th className="border-r border-gray-400 px-2 py-1">
                      닉네임
                    </th>
                    <th className="border-r border-gray-400 px-2 py-1">
                      이메일
                    </th>
                    <th className="px-2 py-1">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {rightCol.map((u) => (
                    <tr
                      key={`right-${u.id}`}
                      className="border-t border-gray-300 hover:bg-gray-50"
                    >
                      <td className="border-r border-gray-300 px-2 py-1">
                        {u.id}
                      </td>
                      <td className="border-r border-gray-300 px-2 py-1">
                        {u.nickname}
                      </td>
                      <td className="border-r border-gray-300 px-2 py-1">
                        {u.email}
                      </td>
                      <td
                        className={`px-2 py-1 font-semibold ${
                          u.status === "가입"
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        {u.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-center gap-2 text-[12px] text-gray-700 mt-4">
            <button
              className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>

            <span className="text-[11px] text-gray-600">
              {page} / {pageCount}
            </span>

            <button
              className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40"
              disabled={page >= pageCount}
              onClick={() =>
                setPage((p) => Math.min(pageCount, p + 1))
              }
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}