// .env: VITE_API_BASE=http://127.0.0.1:4000
const API_BASE = import.meta.env?.VITE_API_BASE || "http://127.0.0.1:4000";

// =========================
//  URL 정규화 & 유틸
// =========================
const resolveUrl = (url) => (url.startsWith("http") ? url : API_BASE + url);

function safeJsonParse(text, fallback = {}) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    return fallback ?? {};
  }
}

function contentTypeIsJson(xhr) {
  const ct = xhr.getResponseHeader?.("content-type") || "";
  return ct.toLowerCase().includes("application/json");
}

// =========================
//  XHR 공통 핸들러
// =========================
function setupXhr({ xhr, onProgress, signal, timeoutMs }) {
  xhr.setRequestHeader("Accept", "application/json");

  // 업로드 진행률
  xhr.upload.onprogress = (evt) => {
    if (evt.lengthComputable && typeof onProgress === "function") {
      onProgress(Math.round((evt.loaded / evt.total) * 100));
    }
  };

  // 취소 연동
  if (signal) {
    if (signal.aborted) xhr.abort();
    else signal.addEventListener("abort", () => xhr.abort());
  }

  // 타임아웃 (선택)
  if (typeof timeoutMs === "number" && timeoutMs > 0) {
    xhr.timeout = timeoutMs;
  }
}

function handleXhrDone(xhr, resolve, reject) {
  const ok = xhr.status >= 200 && xhr.status < 300;
  const data = contentTypeIsJson(xhr)
    ? safeJsonParse(xhr.responseText, { raw: xhr.responseText })
    : { raw: xhr.responseText };

  if (ok) {
    resolve(data);
  } else {
    const msg =
      data?.detail ||
      data?.error ||
      data?.message ||
      `HTTP ${xhr.status}${xhr.statusText ? " " + xhr.statusText : ""}`;
    reject(new Error(msg));
  }
}

// =========================
//  단일 파일 업로드 (범용)
//  - extraForm: 추가 폼필드
//  - relpath: 상대경로(폴더 드롭/선택 시 보존용)
//  - timeoutMs: 요청 타임아웃(ms)
// =========================
export function uploadFile({
  file,
  url,
  onProgress,
  signal,
  extraForm = {},
  relpath,           // string | undefined
  timeoutMs,         // number | undefined
  withCredentials,   // boolean | undefined
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();

    // 파일 및 상대경로(있으면 함께 전송)
    form.append("file", file);
    const rp = relpath || file?.webkitRelativePath || file?._relPath || "";
    if (rp) form.append("relpath", rp);

    // 추가 폼필드
    for (const [k, v] of Object.entries(extraForm || {})) {
      form.append(k, String(v));
    }

    xhr.open("POST", resolveUrl(url), true);
    if (withCredentials) xhr.withCredentials = true;

    setupXhr({ xhr, onProgress, signal, timeoutMs });

    xhr.onload = () => handleXhrDone(xhr, resolve, reject);
    xhr.onerror = () => reject(new Error("네트워크 오류"));
    xhr.onabort = () => reject(new Error("사용자 취소"));
    xhr.ontimeout = () => reject(new Error("요청이 시간 초과되었습니다."));

    xhr.send(form);
  });
}

// =========================
//  여러 파일을 한 요청으로 업로드 (배치)
//  - 서버가 List[UploadFile] (키: files) 받도록 구현된 경우
//  - onProgress: 배치 총합 진행률(%) 콜백
//  - 각 파일의 상대경로는 relpaths[] 로 같이 전송
// =========================
export function uploadFiles({
  files,
  url = "/ingest",
  onProgress,
  signal,
  extraForm = {},
  timeoutMs,
  withCredentials,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();

    // 파일 + 상대경로 배열
    const relpaths = [];
    for (const file of files) {
      form.append("files", file);
      const rp = file?.webkitRelativePath || file?._relPath || "";
      relpaths.push(rp);
    }
    // 서버에서 받을 수 있게 병렬 배열로 전달
    relpaths.forEach((rp) => form.append("relpaths", rp));

    // 추가 폼필드
    for (const [k, v] of Object.entries(extraForm || {})) {
      form.append(k, String(v));
    }

    xhr.open("POST", resolveUrl(url), true);
    if (withCredentials) xhr.withCredentials = true;

    setupXhr({
      xhr,
      onProgress, // 업로드 전체 바이트 기준으로 브라우저가 계산해줌
      signal,
      timeoutMs,
    });

    xhr.onload = () => handleXhrDone(xhr, resolve, reject);
    xhr.onerror = () => reject(new Error("네트워크 오류"));
    xhr.onabort = () => reject(new Error("사용자 취소"));
    xhr.ontimeout = () => reject(new Error("요청이 시간 초과되었습니다."));

    xhr.send(form);
  });
}

// =========================
//  (Deprecated) 변환만
// =========================
export function convertFile({ file, onProgress, signal, timeoutMs, withCredentials }) {
  console.warn("[convertFile] Deprecated: 서버가 /ocr/tesseract 하나로 통합되었으면 사용하지 마세요.");
  return uploadFile({
    file,
    url: "/convert",
    onProgress,
    signal,
    timeoutMs,
    withCredentials,
  });
}

// =========================
//  OCR 실행 (단일 엔드포인트: /ocr/tesseract)
// =========================
export function ocrFile({
  file,
  pdfPath,
  onProgress,
  signal,
  // 👇 기본으로 불필요 산출물 정리(= 최소 산출)
  params = { dpi: 300, prep: "adaptive", langs: "kor+eng", psm: 6, keepExtra: false },
  relpath,
  timeoutMs,
  withCredentials,
}) {
  return new Promise((resolve, reject) => {
    if (!file && !pdfPath) {
      reject(new Error("file 또는 pdfPath 중 하나는 필요합니다."));
      return;
    }

    const xhr = new XMLHttpRequest();
    const form = new FormData();

    if (file) {
      form.append("file", file);
      const rp = relpath || file?.webkitRelativePath || file?._relPath || "";
      if (rp) form.append("relpath", rp);
    }
    if (pdfPath) form.append("pdf_path", pdfPath);

    // OCR 파라미터 전부 폼에 밀어넣기
    for (const [k, v] of Object.entries(params || {})) {
      form.append(k, String(v));
    }

    xhr.open("POST", resolveUrl("/ocr/tesseract"), true);
    if (withCredentials) xhr.withCredentials = true;

    setupXhr({ xhr, onProgress, signal, timeoutMs });
    xhr.onload = () => handleXhrDone(xhr, resolve, reject);
    xhr.onerror = () => reject(new Error("네트워크 오류"));
    xhr.onabort = () => reject(new Error("사용자 취소"));
    xhr.ontimeout = () => reject(new Error("요청이 시간 초과되었습니다."));
    xhr.send(form);
  });
}

// =========================
//  편의 래퍼: 서버 경로 기반 OCR
// =========================
export function ocrByPath({ pdfPath, params, signal, timeoutMs, withCredentials }) {
  return ocrFile({ pdfPath, params, signal, timeoutMs, withCredentials });
}

// =========================
//  다운로드 URL 헬퍼 (선택)
// =========================
export function downloadUrl(serverFileId, kind /* 'pdf'|'text'|'json' */) {
  if (!serverFileId) return "";
  return resolveUrl(`/download/${serverFileId}/${kind}`);
}

export async function streamLLM({ text, model = "gemma3-summarizer", onChunk, signal }) {
  const r = await fetch(`${API_BASE}/llm/summarize_stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, model }),
    signal
  });
  if (!r.ok || !r.body) throw new Error("스트리밍 연결 실패");

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onChunk?.(chunk, full);     // 부분, 누적 모두 전달
  }
  return full;
}

// 서버에 저장된 OCR 텍스트 원문 가져오기(이미 있는 download 라우트 활용)
export async function fetchOcrText(fileId) {
  const r = await fetch(`${API_BASE}/download/${fileId}/text`);
  if (!r.ok) throw new Error("원문 텍스트 조회 실패");
  return await r.text();
}

// 이미 있을 api.js에 추가
export async function searchDocuments({ q = "", categories = [], page = 1, pageSize = 20 } = {}) {
  const API_BASE = import.meta.env?.VITE_API_BASE || "http://127.0.0.1:4000";
  const url = new URL(`${API_BASE}/docs/search`);
  if (q) url.searchParams.set("q", q);
  if (categories?.length) url.searchParams.set("categories", categories.join(","));
  url.searchParams.set("page", page);
  url.searchParams.set("pageSize", pageSize);

  const r = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`검색 실패 (${r.status})`);
  // 기대 응답 형식:
  // { items: [{ id, title, filename, size, tags, summary, serverFileId, createdAt }], total, categories }
  return r.json();
}