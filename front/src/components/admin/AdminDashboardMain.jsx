import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminDashboardMain() {
  // 더미 데이터
  const userStats = {
    total: 1287,
    newThisMonth: 200,
    withdrawn: 112,
  };

 // 오늘 기준 최근 7일 자동 생성 (오늘 포함)
  const today = new Date();
  const recent7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i)); // 6일 전부터 오늘까지
    const dayLabel = `${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
    return dayLabel;
  });

  // 더미 데이터 자동 생성
  const uploadStats = recent7Days.map((day) => ({
    day,
    uploads: Math.floor(Math.random() * 50) + 30, // 30~80 사이 랜덤
  }));

  const visitStats = recent7Days.map((day) => ({
    day,
    visits: Math.floor(Math.random() * 100) + 90, // 90~190 사이 랜덤
  }));

  // 도넛 차트용
  const pieData = [
    {
      name: "기존 회원",
      value:
        userStats.total - userStats.newThisMonth - userStats.withdrawn,
    },
    { name: "신규 회원", value: userStats.newThisMonth },
    { name: "탈퇴 회원", value: userStats.withdrawn },
  ];

  const COLORS = ["#C8C8C8", "#FF54A1", "#2d2385ff"]; // 기존/신규/탈퇴

  return (
    <section className="flex items-center justify-center bg-transparent">
      <div className="bg-white rounded-md shadow-md border border-gray-300 p-6 max-w-[1100px] w-full text-black text-[13px]">
        {/* 상단 두 칸 */}
        <div className="flex flex-wrap gap-4">
          {/* 회원 통계 (도넛) */}
          <div className="bg-[#f8f8f8] border border-gray-400 rounded-md p-4 w-[320px] flex-shrink-0">
            <div className="text-[12px] mb-3">
              총 회원수 / 신규 가입 수 (최근 30일)
            </div>

            <div className="flex justify-between mb-4 text-[12px]">
              <div>
                <div className="text-gray-600">총 회원수</div>
                <div className="text-[20px] font-semibold">
                  {userStats.total.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-600">신규 가입</div>
                <div className="text-[16px] font-semibold text-pink-600">
                  +{userStats.newThisMonth}
                </div>
                <div className="text-gray-600 mt-2">탈퇴</div>
                <div className="text-[13px] font-semibold text-gray-700">
                  {userStats.withdrawn}
                </div>
              </div>
            </div>

            {/* 도넛 그래프 */}
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}명`} />
                <Legend verticalAlign="bottom" height={30} />
              </PieChart>
            </ResponsiveContainer>

            
          </div>

          {/* 업로드 수 그래프 */}
          <div className="flex-1 min-w-[280px] bg-[#f8f8f8] border border-gray-400 rounded-md p-4">
            <div className="flex justify-between text-[12px] mb-2">
              <span className="font-medium">업로드 수</span>
              <span className="text-[11px] text-gray-700">최근 7일</span>
            </div>

            <div className="h-[280px] bg-white border border-gray-300 rounded-sm p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={uploadStats}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  barCategoryGap="20%" // 막대 간격 약간 띄움
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="uploads" radius={[4, 4, 0, 0]} fill="url(#colorUv)">
                    <defs>
                      <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF54A1" />
                        <stop offset="100%" stopColor="#B862FF" />
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 접속자 수 그래프 */}
        <div className="bg-[#f8f8f8] border border-gray-400 rounded-md p-4 mt-4">
          <div className="flex justify-between text-[12px] mb-2">
            <span className="font-medium">접속자 수</span>
            <span className="text-[11px] text-gray-700">최근 7일</span>
          </div>

          <div className="h-[220px] bg-white border border-gray-300 rounded-sm p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="visits"
                  stroke="#FF54A1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 안내 문구 */}
        <p className="text-[11px] text-gray-500 mt-3 text-center leading-relaxed">
          ※ 현재는 더미 데이터입니다. 실제 서비스 시 Oracle DB에서
          <br />
          최근 n일 업로드 수, 방문자 수, 신규 가입자 수를 불러와 표시합니다.
        </p>
      </div>
    </section>
  );
}