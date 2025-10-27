import React, { useState } from "react";

export default function AdminUserManage() {
  // 검색 상태 (닉네임 or 이메일)
  const [keyword, setKeyword] = useState("");

  const handleSearch = () => {
    // TODO: 백엔드 연동
    // 예: GET /admin/users?query=keyword
    console.log("search user by", keyword);
  };

  return (
    <section className="max-w-[1100px] mx-auto text-[13px] text-black">
      {/* 상단 영역: 회원 관리 + 검색박스 */}
      <div className="bg-[#dcdcdc] border border-black rounded-sm p-4 flex flex-col gap-3 mb-6">
        <div className="text-[14px] font-semibold text-black">
          회원 관리
        </div>

        {/* 검색행 */}
        <div className="flex flex-col gap-2">
          <div className="bg-white border border-black h-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-[13px] text-black px-3 py-2">
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-[12px] whitespace-nowrap">
                닉네임 / 이메일
              </label>
              <input
                className="flex-1 border border-gray-400 rounded px-2 py-1 text-[12px] outline-none"
                placeholder="검색어를 입력하세요"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            <button
              onClick={handleSearch}
              className="mt-2 sm:mt-0 sm:ml-2 px-3 py-1 border border-gray-600 rounded bg-white hover:bg-gray-100 text-[12px] whitespace-nowrap"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 카드: 요약수치 + 테이블 */}
      <div className="bg-white rounded-md shadow-md border border-gray-300 p-4">
        {/* 상단 라벨 & "전체"버튼 */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-[14px] font-semibold text-black">
            고객 규모(인원)
          </div>

          <button className="text-[12px] border border-gray-400 rounded px-2 py-1 bg-white hover:bg-gray-100">
            전체
          </button>
        </div>

        {/* 수치들 */}
        <div className="flex flex-wrap gap-6 text-[12px] text-black mb-4">
          <div>
            총 회원 수 <br />
            <span className="text-[16px] font-bold">10</span>
          </div>
          <div>
            현재 회원 수 <br />
            <span className="text-[16px] font-bold">8</span>
          </div>
          <div>
            탈퇴 회원 수 <br />
            <span className="text-[16px] font-bold">2</span>
          </div>
          <div>
            신규 가입 수 <br />
            <span className="text-[16px] font-bold">3</span>
          </div>
        </div>

        {/* 리스트 테이블 */}
        <div className="text-[12px]">
          <div className="font-medium mb-2">
            고객 상세 리스트(최신등록순)
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] border border-gray-400">
              <thead className="bg-[#efefef]">
                <tr>
                  <th className="border border-gray-400 px-2 py-1">회원 번호</th>
                  <th className="border border-gray-400 px-2 py-1">닉네임</th>
                  <th className="border border-gray-400 px-2 py-1">회원 이메일</th>
                  <th className="border border-gray-400 px-2 py-1">상태</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50">
                  <td className="border border-gray-400 px-2 py-1">1</td>
                  <td className="border border-gray-400 px-2 py-1">김현우</td>
                  <td className="border border-gray-400 px-2 py-1">
                    makim9@kh.or.kr
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-green-700">
                    가입
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="border border-gray-400 px-2 py-1">2</td>
                  <td className="border border-gray-400 px-2 py-1">최나연</td>
                  <td className="border border-gray-400 px-2 py-1">
                    nkoim@kh.or.kr
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-red-600">
                    탈퇴
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="border border-gray-400 px-2 py-1">3</td>
                  <td className="border border-gray-400 px-2 py-1">황민지</td>
                  <td className="border border-gray-400 px-2 py-1">
                    kingmin@kh.or.kr
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-green-700">
                    가입
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="text-center text-[11px] text-gray-600 mt-3">
            &lt;&lt; 1 2 3 4 5 6 7 8 9 &gt;&gt;
          </div>
        </div>
      </div>
    </section>
  );
}