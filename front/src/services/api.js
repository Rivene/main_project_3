// =========================
//  API 기본 설정
// =========================
const API_BASE = import.meta.env?.VITE_API_URL || "http://127.0.0.1:4000";
const url = (p) => (p.startsWith("http") ? p : API_BASE + p);

// =========================
//  URL 정규화 & 유틸
// =========================
const resolveUrl = (u) => (u.startsWith("http") ? u : API_BASE + u);

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

// JWT 토큰 가져오기
function getToken() {
  return localStorage.getItem("token");
}

// 요청 헤더에 JWT 자동 추가
function setAuthHeader(xhr) {
  const token = getToken();
  if (token) {
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  }
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
    setAuthHeader(xhr);
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
    setAuthHeader(xhr);
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
    setAuthHeader(xhr);
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

export async function uploadPdfToOCR({
  file,                   // File 객체 (또는 null)
  pdfPath,                // 서버 경로로 직접 지정시 (선택)
  dpi = 300,
  prep = "adaptive",
  langs = "kor+eng",
  psm = 6,
  doLLMSummary = false,
  llmModel = "gemma3-summarizer",
  categoryName,           // ← 추가
  titleOverride           // ← 추가
}) {
  const fd = new FormData();
  if (file) fd.append("file", file);
  if (pdfPath) fd.append("pdf_path", pdfPath);

  fd.append("dpi", String(dpi));
  fd.append("prep", prep);
  fd.append("langs", langs);
  fd.append("psm", String(psm));
  fd.append("do_llm_summary", String(!!doLLMSummary));
  fd.append("llm_model", llmModel);

  if (categoryName)  fd.append("category_name", categoryName);
  if (titleOverride) fd.append("title_override", titleOverride);

  const res = await fetch(url("/ocr/tesseract"), { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return res.json();
}


// 문서검색 비동기 함수 
export async function searchDocuments({ q = "", categories = [], page = 1, pageSize = 20 }) {
  const u = new URL(`${API_BASE}/search/documents`);
  if (q) u.searchParams.set("q", q);
  u.searchParams.set("page", String(page));
  u.searchParams.set("pageSize", String(pageSize));
  (categories || []).forEach((c) => u.searchParams.append("category", c));

  try {
    const res = await fetch(u.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`검색 실패 (${res.status}) ${msg}`);
    }
    return await res.json(); 
  } catch (err) {
    throw new Error(err?.message || "Failed to fetch");
  }
}

export async function getCategories() {
  const res = await fetch(`${API_BASE}/search/categories`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`카테고리 조회 실패 (${res.status}) ${msg}`);
  }
  const data = await res.json();

  const pairs = Array.isArray(data?.categories) ? data.categories : [];
  const mains = Array.isArray(data?.mains) ? data.mains : [];

  // '주/부' 결합형 라벨들 (UI 칩/폴백용)
  const joined = pairs
    .map((p) => p?.catPath || [p?.main, p?.sub].filter(Boolean).join("/"))
    .filter(Boolean);

  // 트리: main -> [subs...]
  const tree = pairs.reduce((acc, p) => {
    const m = p?.main;
    const s = p?.sub;
    if (!m || !s) return acc;
    if (!acc[m]) acc[m] = new Set();
    acc[m].add(s);
    return acc;
  }, {});
  // Set -> 정렬된 배열로 변환
  Object.keys(tree).forEach((m) => {
    tree[m] = Array.from(tree[m]).sort();
  });

  return {
    raw: data,         // 원본 응답
    categories: pairs, // [{ main, sub, catPath, cnt }]
    mains,             // ["교육", "법률", ...]
    joined,            // ["교육/법률제도", ...]
    tree,              // { "교육": ["법률제도", ...], ... }
  };
}