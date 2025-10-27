export async function request(url, options = {}) {
  try {
    const res = await fetch(url, options);

    // 서버 응답 상태 체크
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text || "요청 실패"}`);
    }

    // JSON 파싱 시도 (JSON이 아닐 수도 있으므로 fallback)
    try {
      return await res.json();
    } catch {
      return await res.text();
    }
  } catch (err) {
    console.error("❌ 서버 요청 중 오류 발생:", err.message);
    alert("서버 요청 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.");
    throw err;
  }
}