import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ocrFile } from "../services/api";
import Sidebar from "../components/Sidebar";
import UploadHome from "../components/UploadHome";
import MyPage from "../components/MyPage";

import {
  extractFilesFromDataTransfer,
  extractFromZip,
  ACCEPT_EXT,
  MAX_SIZE_MB,
  prettyBytes,
  extractServerFileId,
  parseCategoriesFromSummary,
  categorize,
  downloadAllResultsAsZip,
} from "../utils/uploadHelpers";

import { useNavigate } from "react-router-dom";

function stem(name = "") {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
function topFolderOf(relPath = "") {
  if (!relPath) return "";
  const parts = relPath.split("/").filter(Boolean);
  return parts.length ? parts[0] : "";
}
function inferDefaultCategoryFromRel(rel) {
  return topFolderOf(rel) || "Uncategorized";
}
function inferDefaultTitle(filename) {
  return stem(filename);
}

export default function UploadPage() {

  const navigate = useNavigate();
  // 업로드 아이템 목록
  const [items, setItems] = useState([]); // {id, file, status, progress, error, controller, result, categoryName, title}

  // 드래그 오버 상태
  const [dragOver, setDragOver] = useState(false);

  // file input 레퍼런스
  const inputRef = useRef(null);
  const dirInputRef = useRef(null);

  // 페이지 상태
  const [activeTab, setActiveTab] = useState("home"); // 'home' | 'mypage' | 'admin'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCats, setSelectedCats] = useState(() => new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 폴더 업로드 가능 설정
  useEffect(() => {
    const el = dirInputRef.current;
    if (el) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
      el.setAttribute("mozdirectory", "");
      el.setAttribute("allowdirs", "");
      el.setAttribute("multiple", "");
    }
  }, []);

  // 허용 확장자 어트리뷰트
  const acceptAttr = useMemo(
    () => [...ACCEPT_EXT, "application/pdf"].join(","),
    []
  );

  // 파일 검증
  const validate = (file) => {
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!ACCEPT_EXT.includes(ext))
      return `허용되지 않은 확장자 (${ext})`;
    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return `파일이 너무 큽니다 (${prettyBytes(file.size)} > ${MAX_SIZE_MB} MB)`;
    return null;
  };

  // 파일 목록에 추가
  // UploadPage.jsx 안에 있는 addFiles를 이걸로 교체
  const addFiles = useCallback(async (files) => {
    if (!files?.length) return;

    // FileList일 수도 있고 배열일 수도 있으니까 통일
    const arr = Array.from(files);

    // expanded: zip 풀린 결과까지 포함한 최종 파일 배열
    const expanded = [];

    for (const file of arr) {
      const lowerName = (file.name || "").toLowerCase();
      const ext = "." + (lowerName.split(".").pop() || "").toLowerCase();

      if (ext === ".zip") {
        // zip이면 내부에 있는 허용된 파일들만 뽑아서 push
        try {
          const innerFiles = await extractFromZip(file); 
          // zip 안에 pdf, hwp, docx 등등이 있으면 그걸 그대로 expanded에 추가
          expanded.push(...innerFiles);
        } catch (err) {
          console.error("zip 해제 실패:", err);
        }
      } else {
        // zip이 아니라면 그냥 통과
        expanded.push(file);
      }
    }

    // 이제 expanded에는:
    // - 일반 파일들
    // - zip 내부에서 풀린 파일들 (zip 자체는 기본적으로 안 넣음)
    // 들이 들어있다.

    setItems((prev) => {
      // prev에 이미 있는 파일과 중복 안 넣도록 중복키 세트
      const seenPrev = new Set(
        prev.map((it) => {
          const f = it.file || {};
          const rel = f.webkitRelativePath || f._relPath || "";
          return `${rel}::${f.name}:${f.size}:${f.lastModified || 0}`;
        })
      );

      const toAdd = [];

      for (const file of expanded) {
        // 상대경로 (폴더 업로드/zip 내부 경로에서 옴)
        const rel = file.webkitRelativePath || file._relPath || "";
        const key = `${rel}::${file.name}:${file.size}:${file.lastModified || 0}`;
        if (seenPrev.has(key)) continue;

        // 유효성 검사 (확장자/사이즈)
        const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
        if (!ACCEPT_EXT.includes(ext)) {
          // 지원 안 하는 형식은 스킵
          continue;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          // 너무 큰 파일은 에러 상태로 넣어주자 (사용자가 보이긴 해야 하니까)
          toAdd.push({
            id: crypto.randomUUID(),
            file,
            status: "error",
            progress: 0,
            error: `파일이 너무 큽니다 (${prettyBytes(file.size)} > ${MAX_SIZE_MB} MB)`,
            controller: null,
            result: null,
            categoryName: inferDefaultCategoryFromRel(rel),
            title: inferDefaultTitle(file.name),
          });
          continue;
        }

        // 정상 케이스
        toAdd.push({
          id: crypto.randomUUID(),
          file,
          status: "idle",      // 아직 서버 전송 안 함
          progress: 0,
          error: null,
          controller: null,
          result: null,
          categoryName: inferDefaultCategoryFromRel(rel),
          title: inferDefaultTitle(file.name),
        });
      }

      return toAdd.length ? [...toAdd, ...prev] : prev;
    });
  }, []);

  // 드래그&드롭 핸들링
  const onDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const files = await extractFilesFromDataTransfer(e.dataTransfer);
      if (files?.length) {
        await addFiles(files);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 일괄 업로드 시작
  const onStartAll = useCallback(async () => {
    const queue = items
      .filter((it) => it.status === "idle")
      .map((it) => it.id);
    if (queue.length === 0) return;
    let active = 0,
      idx = 0,
      MAX_CONCURRENCY = 10;
    const kick = () => {
      while (active < MAX_CONCURRENCY && idx < queue.length) {
        const id = queue[idx++];
        active++;
        Promise.resolve(startUpload(id)).finally(() => {
          active--;
          kick();
        });
      }
    };
    kick();
  }, [items]);

  // 개별 업로드 시작
  const startUpload = useCallback(
    async (id) => {
      const cur = items.find((it) => it.id === id);
      if (!cur || cur.error) return;
      if (cur.status === "uploading" || cur.status === "done") return;

      const controller = new AbortController();
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, status: "uploading", progress: 0, controller }
            : it
        )
      );
      try {
        const ocrRes = await ocrFile({
          file: cur.file,
          params: {
            dpi: 300,
            prep: "adaptive",
            langs: "kor+eng",
            psm: 6,
            do_llm_summary: true,
            llm_model: "gemma3-summarizer",
            category_name: cur.categoryName || "Uncategorized",
            title_override: cur.title || stem(cur.file?.name || ""),
          },
          signal: controller.signal,
        });

        const serverFileId = extractServerFileId(ocrRes);
        const summary = ocrRes?.llmSummary || "";
        let tags = parseCategoriesFromSummary(summary);
        if (tags.length === 0)
          tags = categorize(summary || JSON.stringify(ocrRes || {}));

        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  status: "done",
                  progress: 100,
                  controller: null,
                  result: { ocr: ocrRes, serverFileId, summary, tags },
                }
              : it
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  status: "error",
                  controller: null,
                  error: err.message,
                }
              : it
          )
        );
      }
    },
    [items]
  );

  // 취소/삭제
  const onCancel = (id) => {
    const ctrl = items.find((it) => it.id === id)?.controller;
    if (ctrl) ctrl.abort();
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, status: "idle", controller: null, progress: 0 }
          : it
      )
    );
  };
  const onRemove = (id) =>
    setItems((prev) => prev.filter((it) => it.id !== id));

  // 총 용량 계산
  const totalSizeStr = useMemo(
    () =>
      prettyBytes(
        items.reduce((s, it) => s + (it.file?.size || 0), 0)
      ),
    [items]
  );

  // 총 파일 계산
  const totalFileCount = useMemo(
    () => items.length,
    [items]
  );

  // 업로드/처리(status === "done") 끝난 항목만 추출
  const doneItems = useMemo(
    () => items.filter((it) => it.status === "done" && it.result),
    [items]
  );

  // ZIP 다운로드 버튼 클릭 핸들러
  const handleDownloadAllZip = async () => {
    if (doneItems.length === 0) {
      alert("완료된 문서가 없습니다.");
      return;
    }
    await downloadAllResultsAsZip(doneItems);
  };

  // 카테고리 전체 목록
  const allCategories = useMemo(() => {
    const s = new Set();
    for (const it of items) {
      if (it.status !== "done") continue; 

      if (it.categoryName) s.add(it.categoryName);
      (it?.result?.tags || []).forEach((t) => s.add(t));
    }
    return Array.from(s).sort();
  }, [items]);

  const toggleCat = (cat) =>
    setSelectedCats((prev) => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCats(new Set());
  };

  const normalized = (v) => String(v || "").toLowerCase();

  // 검색/필터된 아이템
  const filteredItems = useMemo(() => {
    const q = normalized(searchQuery);
    const need = Array.from(selectedCats);
    return items.filter((it) => {
      const tags = [
        ...(it?.result?.tags || []),
        it.categoryName,
      ].filter(Boolean);
      if (!need.every((c) => tags.includes(c))) return false;
      if (!q) return true;
      const hay = [
        it.file?.name || "",
        it?.result?.summary || "",
        tags.join(" "),
        it.title || "",
      ]
        .map(normalized)
        .join(" ");
      return hay.includes(q);
    });
  }, [items, searchQuery, selectedCats]);

  const onItemTagClick = (tag) => {
    setActiveTab("mypage"); // 검색/마이페이지 탭으로 넘기는 흐름
    toggleCat(tag);
  };

  // 파일 input change 핸들링
  useEffect(() => {
    const input = inputRef.current;
    const dir = dirInputRef.current;

    const handler = async (e) => {
      if (e.target.files?.length) {
        await addFiles(e.target.files);
        e.target.value = "";
      }
    };

    input?.addEventListener("change", handler);
    dir?.addEventListener("change", handler);
    return () => {
      input?.removeEventListener("change", handler);
      dir?.removeEventListener("change", handler);
    };
  }, [addFiles]);

  // 페이지 레이아웃
  return (
    <div className="flex">
      {/* 사이드바 */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        categories={allCategories}
        selectedCats={selectedCats}
        toggleCat={toggleCat}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isLoggedIn={true}         // 나중에 실제 값으로
        userNickname={"현우"}     // 나중에 실제 값으로
        onLogout={() => {}}       // 나중에 실제 로직으로
      />

      {/* 메인 영역 */}
      <main className="flex-1 min-h-screen bg-[#f8fafc] p-6">
        {/* 헤더 */}
        <header className="mb-6 flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-gray-900">
            {activeTab === "home"
              ? "문서 업로드"
              : activeTab === "mypage"
              ? "마이페이지"
              : "관리자 페이지"}
          </h1>

          {activeTab === "home" && (
            <div className="text-sm text-gray-600 flex flex-wrap items-center gap-2">
              <span className="text-gray-500">허용 확장자:</span>

              <span className="inline-flex items-center rounded-md bg-gray-100 text-gray-800 text-[11px] font-medium px-2 py-0.5">
                pdf
              </span>
              <span className="inline-flex items-center rounded-md bg-gray-100 text-gray-800 text-[11px] font-medium px-2 py-0.5">
                hwp / hwpx
              </span>
              <span className="inline-flex items-center rounded-md bg-gray-100 text-gray-800 text-[11px] font-medium px-2 py-0.5">
                doc / docx
              </span>
              <span className="inline-flex items-center rounded-md bg-gray-100 text-gray-800 text-[11px] font-medium px-2 py-0.5">
                ppt / pptx
              </span>
              <span className="inline-flex items-center rounded-md bg-gray-100 text-gray-800 text-[11px] font-medium px-2 py-0.5">
                xls / xlsx
              </span>
              <span className="inline-flex items-center rounded-md bg-gray-100 text-gray-800 text-[11px] font-medium px-2 py-0.5">
                zip
              </span>

              <span className="text-gray-400 text-[11px]">
                총 {totalFileCount}개 · {totalSizeStr}
              </span>
            </div>
          )}
        </header>

        {/* 탭별 내용 */}
        {activeTab === "home" && (
          <UploadHome
            items={items}
            dragOver={dragOver}
            setDragOver={setDragOver}
            onDrop={onDrop}
            onStartAll={onStartAll}
            onUpload={startUpload}
            onCancel={onCancel}
            onRemove={onRemove}
            inputRef={inputRef}
            dirInputRef={dirInputRef}
            acceptAttr={acceptAttr}
            onDownloadAllZip={handleDownloadAllZip}
          />
        )}

        {activeTab === "mypage" && (
          <MyPage
            currentUser={{
              nickname: "강현우",
              phone: "010-0000-0000",
              email: "email@abc.com",
              isAdmin: "True",
            }}
            myItemsFromState={items.map(it => ({
              id: it.id,
              filename: it.file?.name,
              size: it.file?.size,
              createdAt: Date.now(),
              serverFileId: it?.result?.serverFileId,
            }))}
          />
        )}

        {activeTab === "admin" && (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center">
            <p className="text-gray-800 text-lg font-semibold mb-4">
              관리자 전용 페이지로 이동합니다.
            </p>
            <button
              onClick={() => navigate("/admin")}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-gradient-to-r from-[#FF54A1] to-[#B862FF] hover:opacity-90 transition"
            >
              관리자 페이지로 이동
            </button>
          </div>
        )}
      </main>
    </div>
  );
}