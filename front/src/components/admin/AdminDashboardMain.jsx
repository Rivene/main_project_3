import React from "react";

export default function AdminDashboardMain() {
  return (
    <section className="max-w-[1100px] mx-auto">
      {/* 전체 카드 */}
      <div className="bg-white rounded-md shadow-md border border-gray-300 p-4">
        {/* 상단 두 칸 레이아웃 */}
        <div className="flex flex-wrap gap-4">
          {/* 왼쪽: 회원수 / 빨간 원 */}
          <div className="bg-[#f8f8f8] border border-gray-400 rounded-sm p-4 w-[320px] flex-shrink-0">
            <div className="text-[12px] text-black leading-snug mb-3">
              총 회원수 / 신규 가입 수 (기준 1달),<br />
              총 회원 수, 탈퇴 회원수
            </div>

            {/* 큰 빨간 원 (placeholder for donut/pie later) */}
            <div className="w-[180px] h-[180px] rounded-full bg-red-600 mx-auto" />
          </div>

          {/* 오른쪽: 업로드 수 그래프 */}
          <div className="flex-1 min-w-[280px] bg-[#f8f8f8] border border-gray-400 rounded-sm p-4">
            <div className="flex justify-between items-start text-[12px] text-black mb-2">
              <span className="font-medium">업로드 수</span>
              <span className="text-[11px] text-gray-700">
                1주, (12)월, (5)년
              </span>
            </div>

            {/* 그래프 placeholder */}
            <div className="h-[140px] bg-white border border-gray-400 relative text-[10px] text-gray-500">
              {/* x축 라인 */}
              <div className="absolute bottom-[20px] left-0 right-0 h-[1px] bg-black" />
              <div className="absolute top-2 left-2">
                (업로드 추이 라인차트 예정)
              </div>
            </div>
          </div>
        </div>

        {/* 하단: 접속자 수 그래프 */}
        <div className="bg-[#f8f8f8] border border-gray-400 rounded-sm p-4 mt-4">
          <div className="flex justify-between items-start text-[12px] text-black mb-2">
            <span className="font-medium">접속자 수</span>
            <span className="text-[11px] text-gray-700">
              1일, 주, (12)월, (5)년
            </span>
          </div>

          {/* 그래프 placeholder */}
          <div className="h-[160px] bg-white border border-gray-400 relative text-[10px] text-gray-500">
            <div className="absolute bottom-[20px] left-0 right-0 h-[1px] bg-black" />
            <div className="absolute top-2 left-2">
              (접속자 추이 라인차트 예정)
            </div>
          </div>
        </div>
      </div>

      {/* 그래프 주석 */}
      <p className="text-[11px] text-white/80 mt-3 text-center">
        ※ 위 그래프 영역은 나중에 실제 데이터 받아와서 라인/막대 차트 그려질 자리입니다.
      </p>
    </section>
  );
}