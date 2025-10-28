import React, { useState, useMemo } from "react";

export default function AdminFileManage() {
  // 검색 상태 (입력 중)
  const [searchType, setSearchType] = useState("nickname"); // 'nickname' | 'filename'
  const [keywordInput, setKeywordInput] = useState("");

  // 실제 검색에 반영된 상태 (버튼/엔터 이후 적용)
  const [searchTerm, setSearchTerm] = useState("");

  // OCR 상태 필터 (상단 탭에서 바꿈) "" | "완료" | "에러"
  const [ocrFilter, setOcrFilter] = useState("");

  // 페이지네이션
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // 파일 전체 목록 (백엔드에서 한 번 받아온다고 가정)
  // status: "완료" | "에러" 
  const allFiles = [
    {
      id: 1,
      nickname: "현우",
      filename: "공공데이터_보고서.pdf",
      uploadedAt: "2025.02.25",
      ext: "pdf",
      size: "0.3mb",
      status: "완료",
    },
    {
      id: 2,
      nickname: "민지",
      filename: "농업지원계획_2025.docx",
      uploadedAt: "2025.02.25",
      ext: "docx",
      size: "1.2mb",
      status: "에러",
    },
    {
      id: 3,
      nickname: "민지",
      filename: "농업지원계획_2025_v2.hwp",
      uploadedAt: "2025.02.26",
      ext: "hwp",
      size: "0.8mb",
      status: "완료",
    },
    {
      id: 4,
      nickname: "가온",
      filename: "주요정책_정리.xlsx",
      uploadedAt: "2025.02.27",
      ext: "xlsx",
      size: "1.1mb",
      status: "완료",
    },
    {
      id: 5,
      nickname: "수현",
      filename: "수출지원_가이드.pptx",
      uploadedAt: "2025.02.27",
      ext: "pptx",
      size: "2.4mb",
      status: "에러",
    },
    {
      id: 6,
      nickname: "지수",
      filename: "기획안_초안.pdf",
      uploadedAt: "2025.02.28",
      ext: "pdf",
      size: "0.4mb",
      status: "완료",
    },
    {
      id: 7,
      nickname: "주호",
      filename: "데이터_정제_결과.xlsx",
      uploadedAt: "2025.02.28",
      ext: "xlsx",
      size: "2.1mb",
      status: "완료",
    },
    {
      id: 8,
      nickname: "현우",
      filename: "OCR_테스트케이스.hwp",
      uploadedAt: "2025.03.01",
      ext: "hwp",
      size: "3.4mb",
      status: "완료",
    },
    {
      id: 9,
      nickname: "나율",
      filename: "요약_샘플문서.docx",
      uploadedAt: "2025.03.01",
      ext: "docx",
      size: "0.7mb",
      status: "완료",
    },
    {
      id: 10,
      nickname: "세연",
      filename: "예산_보고_v3.pdf",
      uploadedAt: "2025.03.02",
      ext: "pdf",
      size: "0.6mb",
      status: "완료",
    },
    {
      id: 11,
      nickname: "지우",
      filename: "회의록_요약본.pptx",
      uploadedAt: "2025.03.02",
      ext: "pptx",
      size: "4.2mb",
      status: "에러",
    },
    {
      id: 12,
      nickname: "세연",
      filename: "예산_보고_v4_final.xlsx",
      uploadedAt: "2025.03.02",
      ext: "xlsx",
      size: "0.65mb",
      status: "완료",
    },
  ];

  // 요약 수치
  const totalCount = allFiles.length;
  const errorCount = allFiles.filter((f) => f.status === "에러").length;
  const doneCount = allFiles.filter((f) => f.status === "완료").length;

  // 1단계: OCR 필터 적용 (ocrFilter가 ""이면 전체)
  const filteredByOcr = useMemo(() => {
    return allFiles.filter((f) => {
      if (!ocrFilter) return true;
      return f.status === ocrFilter;
    });
  }, [allFiles, ocrFilter]);

  // 2단계: 검색어 적용 (searchTerm 기준)
  const filteredFiles = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    if (!kw) return filteredByOcr;

    return filteredByOcr.filter((f) => {
      if (searchType === "nickname") {
        return f.nickname.toLowerCase().includes(kw);
      }
      // searchType === 'filename'
      return f.filename.toLowerCase().includes(kw);
    });
  }, [filteredByOcr, searchTerm, searchType]);

  // 페이지네이션 계산
  const pageCount = Math.max(
    1,
    Math.ceil(filteredFiles.length / PAGE_SIZE)
  );
  const startIdx = (page - 1) * PAGE_SIZE;
  const currentPageSlice = filteredFiles.slice(
    startIdx,
    startIdx + PAGE_SIZE
  );

  // 검색 실행 (버튼 or Enter)
  const triggerSearch = () => {
    setSearchTerm(keywordInput);
    setPage(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      triggerSearch();
    }
  };

  // OCR 상태 필터 버튼 눌렀을 때
  const handleOcrFilter = (val) => {
    setOcrFilter(val); // "" | "완료" | "에러"
    setPage(1);
  };

  // 페이지 이동
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(pageCount, p + 1));

  return (
    <section className="max-w-[1100px] mx-auto text-[13px] text-black">
      {/* 상단 영역: 제목 + 검색 박스 */}
      <div className="bg-white border border-gray-300 rounded-lg p-4 flex flex-col gap-4 mb-6 shadow-sm">
        <div className="text-[15px] font-semibold text-gray-800">
          업로드 파일 관리
        </div>

        {/* 검색 박스: 회원관리 스타일과 통일 */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            {/* 검색 기준 선택 (닉네임 / 파일명) */}
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
                <option value="filename">파일명</option>
              </select>
            </div>

            {/* 검색어 입력 */}
            <div className="flex-1 flex flex-col">
              <label className="text-[12px] text-gray-600 mb-1">
                검색어
              </label>
              <input
                className="border border-gray-400 rounded px-2 py-1 text-[12px] outline-none"
                placeholder={
                  searchType === "nickname"
                    ? "닉네임을 입력하세요"
                    : "파일명을 입력하세요"
                }
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* 검색 버튼 */}
            <div className="flex flex-col">
              <label className="text-[12px] text-gray-600 mb-1 opacity-0 select-none">
                버튼
              </label>
              <button
                onClick={triggerSearch}
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

      {/* 파일 규모 / 필터 / 리스트 */}
      <div className="bg-white rounded-lg shadow-md border border-gray-300 p-4">
        {/* 상단 타이틀 + OCR 상태 필터 버튼들 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="text-[14px] font-semibold text-gray-800">
            파일 규모
          </div>

          {/* OCR 상태 필터: 전체 / 완료 / 에러 만 */}
          <div className="flex flex-wrap gap-2 text-[12px] font-medium">
            <button
              onClick={() => handleOcrFilter("")}
              className={`
                rounded-md border px-3 py-1.5 transition
                ${
                  ocrFilter === ""
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }
              `}
            >
              전체
            </button>

            <button
              onClick={() => handleOcrFilter("완료")}
              className={`
                rounded-md border px-3 py-1.5 transition
                ${
                  ocrFilter === "완료"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }
              `}
            >
              완료
            </button>

            <button
              onClick={() => handleOcrFilter("에러")}
              className={`
                rounded-md border px-3 py-1.5 transition
                ${
                  ocrFilter === "에러"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }
              `}
            >
              에러
            </button>
          </div>
        </div>

        {/* 요약 수치 영역 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 text-[12px] text-gray-800">
          <div className="rounded-md border border-gray-300 bg-gray-50 p-3 flex flex-col">
            <div className="text-[12px] text-gray-600">등록 개수</div>
            <div className="text-[20px] font-bold text-gray-900 leading-none">
              {totalCount}
            </div>
          </div>

          <div className="rounded-md border border-gray-300 bg-gray-50 p-3 flex flex-col">
            <div className="text-[12px] text-gray-600">에러 수</div>
            <div className="text-[20px] font-bold text-red-600 leading-none">
              {errorCount}
            </div>
          </div>

          <div className="rounded-md border border-gray-300 bg-gray-50 p-3 flex flex-col">
            <div className="text-[12px] text-gray-600">완료 수</div>
            <div className="text-[20px] font-bold text-green-700 leading-none">
              {doneCount}
            </div>
          </div>
        </div>

        {/* 파일 상세 리스트 */}
        <div className="text-[12px]">
          <div className="font-medium mb-2 text-[13px] text-gray-900">
            파일 상세 리스트 (최신등록순)
          </div>

          <div className="overflow-x-auto border border-gray-400 rounded-md">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#efefef] border-b border-gray-400">
                <tr>
                  <th className="border-r border-gray-400 px-2 py-1 whitespace-nowrap">
                    파일 번호
                  </th>
                  <th className="border-r border-gray-400 px-2 py-1 whitespace-nowrap">
                    닉네임
                  </th>
                  <th className="border-r border-gray-400 px-2 py-1 whitespace-nowrap">
                    파일 이름
                  </th>
                  <th className="border-r border-gray-400 px-2 py-1 whitespace-nowrap">
                    업로드 일시
                  </th>
                  <th className="border-r border-gray-400 px-2 py-1 whitespace-nowrap">
                    확장자
                  </th>
                  <th className="border-r border-gray-400 px-2 py-1 whitespace-nowrap">
                    파일 크기
                  </th>
                  <th className="border-r border-gray-400 px-2 py-1 whitespace-nowrap">
                    OCR 상태
                  </th>
                  <th className="px-2 py-1 whitespace-nowrap">삭제</th>
                </tr>
              </thead>

              <tbody>
                {currentPageSlice.map((f) => (
                  <tr
                    key={f.id}
                    className="border-t border-gray-300 hover:bg-gray-50 bg-white"
                  >
                    <td className="border-r border-gray-300 px-2 py-1">
                      {f.id}
                    </td>
                    <td className="border-r border-gray-300 px-2 py-1">
                      {f.nickname}
                    </td>
                    <td className="border-r border-gray-300 px-2 py-1">
                      {f.filename}
                    </td>
                    <td className="border-r border-gray-300 px-2 py-1">
                      {f.uploadedAt}
                    </td>
                    <td className="border-r border-gray-300 px-2 py-1">
                      {f.ext}
                    </td>
                    <td className="border-r border-gray-300 px-2 py-1">
                      {f.size}
                    </td>
                    <td className="border-r border-gray-300 px-2 py-1">
                      <span
                        className={
                          f.status === "완료"
                            ? "text-green-700 font-semibold"
                            : f.status === "에러"
                            ? "text-red-600 font-semibold"
                            : "text-gray-600 font-semibold"
                        }
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      <button className="px-2 py-1 border border-gray-600 rounded bg-white hover:bg-gray-100 text-[11px]">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}

                {currentPageSlice.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center text-gray-500 py-6 text-[12px]"
                    >
                      결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-center gap-2 text-[12px] text-gray-700 mt-4">
            <button
              className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40"
              disabled={page <= 1}
              onClick={goPrev}
            >
              이전
            </button>

            <span className="text-[11px] text-gray-600">
              {page} / {pageCount}
            </span>

            <button
              className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40"
              disabled={page >= pageCount}
              onClick={goNext}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}