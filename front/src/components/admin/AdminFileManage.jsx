import React, { useState } from "react";

export default function AdminFileManage() {
  const [nickname, setNickname] = useState("");
  const [filename, setFilename] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");

  const handleSearch = () => {
    // TODO: 백엔드 연동
    // 예: GET /admin/files?nickname=...&filename=...&ocr=...
    console.log("search file by", { nickname, filename, ocrStatus });
  };

  return (
    <section className="max-w-[1100px] mx-auto text-[13px] text-black">
      {/* 상단 검색 헤더 */}
      <div className="bg-[#dcdcdc] border border-black rounded-sm p-4 flex flex-col gap-3 mb-6">
        <div className="text-[14px] font-semibold text-black">
          업로드 파일 관리
        </div>

        {/* 검색폼 */}
        <div className="bg-white border border-black flex flex-col gap-3 px-3 py-3 text-[13px] text-black">
          {/* 행1: 닉네임, 파일명 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-[12px] whitespace-nowrap">
                닉네임
              </label>
              <input
                className="flex-1 border border-gray-400 rounded px-2 py-1 text-[12px] outline-none"
                placeholder="닉네임 검색"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>

            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-[12px] whitespace-nowrap">
                파일명
              </label>
              <input
                className="flex-1 border border-gray-400 rounded px-2 py-1 text-[12px] outline-none"
                placeholder="파일명 검색"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
              />
            </div>
          </div>

          {/* 행2: OCR 상태 + 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <label className="text-[12px] whitespace-nowrap">
                OCR 상태
              </label>
              <select
                className="border border-gray-400 rounded px-2 py-1 text-[12px] outline-none"
                value={ocrStatus}
                onChange={(e) => setOcrStatus(e.target.value)}
              >
                <option value="">전체</option>
                <option value="done">완료</option>
                <option value="error">에러</option>
                <option value="processing">처리중</option>
              </select>
            </div>

            <button
              onClick={handleSearch}
              className="px-3 py-1 border border-gray-600 rounded bg-white hover:bg-gray-100 text-[12px] whitespace-nowrap"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 카드: 파일 요약 & 테이블 */}
      <div className="bg-white rounded-md shadow-md border border-gray-300 p-4">
        {/* 타이틀 & 전체 버튼 */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-[14px] font-semibold text-black">
            파일 규모
          </div>
          <button className="text-[12px] border border-gray-400 rounded px-2 py-1 bg-white hover:bg-gray-100">
            전체
          </button>
        </div>

        {/* 숫자 요약 */}
        <div className="flex flex-wrap gap-6 text-[12px] text-black mb-4">
          <div>
            등록 개수 <br />
            <span className="text-[16px] font-bold">20</span>
          </div>
          <div>
            에러 수 <br />
            <span className="text-[16px] font-bold text-red-600">10</span>
          </div>
          <div>
            완료 수 <br />
            <span className="text-[16px] font-bold text-green-700">10</span>
          </div>
        </div>

        {/* 파일 상세 테이블 */}
        <div className="text-[12px]">
          <div className="font-medium mb-2">
            파일 상세 리스트(최신등록순)
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] border border-gray-400">
              <thead className="bg-[#efefef]">
                <tr>
                  <th className="border border-gray-400 px-2 py-1">파일 번호</th>
                  <th className="border border-gray-400 px-2 py-1">닉네임</th>
                  <th className="border border-gray-400 px-2 py-1">파일 이름</th>
                  <th className="border border-gray-400 px-2 py-1">
                    업로드 일시
                  </th>
                  <th className="border border-gray-400 px-2 py-1">
                    확장자
                  </th>
                  <th className="border border-gray-400 px-2 py-1">파일 크기</th>
                  <th className="border border-gray-400 px-2 py-1">
                    OCR 상태
                  </th>
                  <th className="border border-gray-400 px-2 py-1">삭제</th>
                </tr>
              </thead>

              <tbody>
                {/* row 1 */}
                <tr className="bg-white hover:bg-gray-50">
                  <td className="border border-gray-400 px-2 py-1">1</td>
                  <td className="border border-gray-400 px-2 py-1">
                    현우
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    공공데이터_보고서.pdf
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    2025.02.25
                  </td>
                  <td className="border border-gray-400 px-2 py-1">pdf</td>
                  <td className="border border-gray-400 px-2 py-1">0.3mb</td>
                  <td className="border border-gray-400 px-2 py-1 text-green-700">
                    완료
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    <button className="px-2 py-1 border border-gray-600 rounded bg-white hover:bg-gray-100 text-[11px]">
                      삭제
                    </button>
                  </td>
                </tr>

                {/* row 2 */}
                <tr className="bg-white hover:bg-gray-50">
                  <td className="border border-gray-400 px-2 py-1">2</td>
                  <td className="border border-gray-400 px-2 py-1">
                    민지
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    농업지원계획_2025.pdf
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    2025.02.25
                  </td>
                  <td className="border border-gray-400 px-2 py-1">pdf</td>
                  <td className="border border-gray-400 px-2 py-1">0.3mb</td>
                  <td className="border border-gray-400 px-2 py-1 text-red-600">
                    에러
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    <button className="px-2 py-1 border border-gray-600 rounded bg-white hover:bg-gray-100 text-[11px]">
                      삭제
                    </button>
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