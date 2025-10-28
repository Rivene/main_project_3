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

  // ✅ 로그인 상태 관리 추가
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState("");

  // ✅ localStorage에서 로그인 상태 복원
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (token && user?.name) {
      setIsLoggedIn(true);
      setNickname(user.name);
    } else {
      setIsLoggedIn(false);
      setNickname("");
    }
  }, []);

  // ✅ 로그아웃 로직 추가
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setNickname("");
    navigate("/member/login");
  };

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
  const addFiles = useCallback(async (files) => {
    if (!files?.length) return;

    const arr = Array.from(files);
    const expanded = [];

    for (const file of arr) {
      const lowerName = (file.name || "").toLowerCase();
      const ext = "." + (lowerName.split(".").pop() || "").toLowerCase();

      if (ext === ".zip") {
        try {
          const innerFiles = await extractFromZip(file);
          expanded.push(...innerFiles);
        } catch (err) {
          console.error("zip 해제 실패:", err);
        }
      } else {
        expanded.push(file);
      }
    }

    setItems((prev) => {
      const seenPrev = new Set(
        prev.map((it) => {
          const f = it.file || {};
          const rel = f.webkitRelativePath || f._relPath || "";
          return `${rel}::${f.name}:${f.size}:${f.lastModified || 0}`;
        })
      );

      const toAdd = [];

      for (const file of expanded) {
        const rel = file.webkitRelativePath || file._relPath || "";
        const key = `${rel}::${file.name}:${file.size}:${file.lastModified || 0}`;
        if (seenPrev.has(key)) continue;

        const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
        if (!ACCEPT_EXT.includes(ext)) continue;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
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

        toAdd.push({
          id: crypto.randomUUID(),
          file,
          status: "idle",
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
  const totalFileCount = useMemo(() => items.length, [items]);

  // 업로드 완료 항목
  const doneItems = useMemo(
    () => items.filter((it) => it.status === "done" && it.result),
    [items]
  );

  // ZIP 다운로드
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

  const normalized = (v) => String(v || "").toLowerCase();

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
    setActiveTab("mypage");
    toggleCat(tag);
  };

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

  // ✅ Sidebar에 로그인 상태 반영
  return (
    <div className="flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        categories={allCategories}
        selectedCats={selectedCats}
        toggleCat={toggleCat}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isLoggedIn={isLoggedIn}
        userNickname={nickname}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-h-screen bg-[#f8fafc] p-6">
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
              nickname: nickname || "사용자",
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
