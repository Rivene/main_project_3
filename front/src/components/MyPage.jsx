import React, { useEffect, useMemo, useState, useCallback } from "react";
import ProfileEditModal from "../components/ProfileEditModal";
import {
  joinUrl,
  prettyBytes,
  saveText,
  savePdf,
} from "../utils/uploadHelpers";
import { searchDocuments, getCategories } from "../services/api";

const CLIENT_PAGING_THRESHOLD = 2000;
const SERVER_MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export default function MyPage({ currentUser, myItemsFromState = [] }) {
  //
  // currentUser 예시 (백 붙으면 이걸로 넘기면 됨)
  // {
  //   displayName: "강현우",
  //   phone: "010-0000-0000",
  //   email: "email@abc.com",
  // }
  //
  // myItemsFromState: 이미 업로드된 파일들(프론트 상태 or 서버)
  // [{
  //   id, filename, size, createdAt, serverFileId
  // }]
  //

  // 프로필 수정 모달
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(currentUser);

  const handleSaveProfile = (updated) => {
    // 백엔드 연동 시 updateProfile API 연결 예정
    setUser(updated);
    console.log(" 프로필 업데이트 완료:", updated);
  };

  // 검색어
  const [q, setQ] = useState("");

  // 목록/페이징
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [allMode, setAllMode] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0);

  // 카테고리
  const [catsMaster, setCatsMaster] = useState([]); // 전체 마스터
  const [catsRaw, setCatsRaw] = useState([]); // 결과 기반
  const [mainSel, setMainSel] = useState("");
  const [subSel, setSubSel] = useState(new Set());

  // ===== 헬퍼 =====
  const mapItemToCatPath = (it) => {
    const catPath =
      it.catPath ||
      it.cat_path ||
      (it.parent_name && it.child_name
        ? `${it.parent_name}/${it.child_name}`
        : it.child_name || it.parent_name || null);
    return { ...it, catPath };
  };

  const extractJoinedCats = (res, mapped) => {
    if (Array.isArray(res?.categories) && res.categories.length > 0) {
      return Array.from(
        new Set(
          res.categories
            .map(String)
            .map((s) => s.trim())
            .filter((s) => s.includes("/"))
        )
      ).sort();
    }
    return Array.from(
      new Set(
        (mapped || [])
          .map((it) => it.catPath)
          .filter(Boolean)
          .filter((s) => s.includes("/"))
      )
    ).sort();
  };

  // ===== 카테고리 트리 =====
  const catSource = catsMaster.length > 0 ? catsMaster : catsRaw;
  const catTree = useMemo(() => {
    const m = new Map();
    (catSource || []).forEach((j) => {
      const [main, sub] = String(j).split("/");
      if (!main || !sub) return;
      if (!m.has(main)) m.set(main, new Set());
      m.get(main).add(sub);
    });
    return m;
  }, [catSource]);

  const mainList = useMemo(() => Array.from(catTree.keys()).sort(), [catTree]);
  const subList = useMemo(() => {
    if (!mainSel) return [];
    return Array.from(catTree.get(mainSel) || []).sort();
  }, [catTree, mainSel]);

  // ===== 검색 파라미터로 보낼 카테고리 =====
  const categoriesToSend = useMemo(() => {
    if (subSel.size > 0 && mainSel) {
      return Array.from(subSel).map((s) => `${mainSel}/${s}`);
    }
    if (mainSel && catTree.has(mainSel)) {
      return Array.from(catTree.get(mainSel)).map((s) => `${mainSel}/${s}`);
    }
    return [];
  }, [mainSel, subSel, catTree]);

  // ===== 표시할 목록 / 페이징 =====
  const visibleItems = useMemo(() => {
    if (!allMode) return items;
    const start = (page - 1) * pageSize;
    return allItems.slice(start, start + pageSize);
  }, [allMode, items, allItems, page, pageSize]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  // ===== 초기 카테고리 로드 =====
  useEffect(() => {
    (async () => {
      try {
        const res = await getCategories();
        const joined = Array.from(
          new Set(
            (res?.categories || [])
              .map((c) => c?.catPath)
              .filter(Boolean)
          )
        ).sort();
        setCatsMaster(joined);
      } catch (e) {
        console.warn("카테고리 로드 실패. 검색 결과 기반으로 대체 예정", e);
      }
    })();
  }, []);

  // ===== 검색 실행 =====
  const doSearch = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 총 개수만 우선 체크
      const head = await searchDocuments({
        q,
        categories: categoriesToSend,
        page: 1,
        pageSize: 1,
      });
      const totalCount = head?.total ?? 0;

      if (totalCount > 0 && totalCount <= CLIENT_PAGING_THRESHOLD) {
        // 전체 긁어서 프론트 페이징
        const pages = Math.max(
          1,
          Math.ceil(totalCount / SERVER_MAX_PAGE_SIZE)
        );
        let acc = [];
        let catsSet = new Set();

        for (let p = 1; p <= pages; p++) {
          const chunk = await searchDocuments({
            q,
            categories: categoriesToSend,
            page: p,
            pageSize: SERVER_MAX_PAGE_SIZE,
          });
          const mappedChunk = (chunk?.items || []).map(mapItemToCatPath);
          acc = acc.concat(mappedChunk);

          extractJoinedCats(chunk, mappedChunk).forEach((c) =>
            catsSet.add(c)
          );
        }

        // 프론트에서 q로 2차 필터 (파일명/카테고리만)
        const qTrim = q.trim().toLowerCase();
        const afterFilter = !qTrim
          ? acc
          : acc.filter((it) => {
              const name = (it.title || it.filename || "").toLowerCase();
              const cat = (it.catPath || "").toLowerCase();
              return (
                name.includes(qTrim) ||
                cat.includes(qTrim)
              );
            });

        setAllItems(afterFilter);
        setItems([]);
        setAllMode(true);
        setTotal(afterFilter.length);

        if (catsMaster.length === 0) {
          setCatsRaw(Array.from(catsSet).sort());
        }
      } else {
        // 서버 페이징 모드
        const pageRes = await searchDocuments({
          q,
          categories: categoriesToSend,
          page,
          pageSize: SERVER_MAX_PAGE_SIZE,
        });

        const mapped = (pageRes.items || []).map(mapItemToCatPath);

        const qTrim = q.trim().toLowerCase();
        const afterFilter = !qTrim
          ? mapped
          : mapped.filter((it) => {
              const name = (it.title || it.filename || "").toLowerCase();
              const cat = (it.catPath || "").toLowerCase();
              return (
                name.includes(qTrim) ||
                cat.includes(qTrim)
              );
            });

        setItems(afterFilter);
        setAllItems([]);
        setAllMode(false);
        setTotal(pageRes.total ?? afterFilter.length);

        if (catsMaster.length === 0) {
          setCatsRaw(extractJoinedCats(pageRes, mapped));
        }
      }
    } catch (e) {
      setError(e?.message || "검색 중 오류");
      setItems([]);
      setAllItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, categoriesToSend, page, catsMaster.length]);

  // 초기 1회 검색
  useEffect(() => {
    setSearchTrigger((n) => n + 1);
  }, []);
  useEffect(() => {
    if (searchTrigger) doSearch();
  }, [searchTrigger]);
  useEffect(() => {
    if (searchTrigger && !allMode) doSearch();
  }, [page]);

  // ===== 상호작용 =====
  const onKeyDownSearch = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setPage(1);
      setSearchTrigger((n) => n + 1);
    }
  };

  const onClickMain = (m) => {
    setMainSel((prev) => (prev === m ? "" : m));
    setSubSel(new Set());
    setPage(1);
    setSearchTrigger((n) => n + 1);
  };

  const onToggleSub = (s) => {
    setSubSel((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
    setPage(1);
    setSearchTrigger((n) => n + 1);
  };

  const clearFilters = () => {
    setQ("");
    setMainSel("");
    setSubSel(new Set());
    setPage(1);
    setItems([]);
    setAllItems([]);
    setTotal(0);
    setSearchTrigger((n) => n + 1);
  };

  const renderCatJoined = (catPath) => {
    if (!catPath) return null;
    const [main, sub] = String(catPath).split("/");
    return (
      <span className="inline-flex items-center rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-medium px-2 py-[2px]">
        <span>{main || "-"}</span>
        <span className="mx-1 text-gray-400">·</span>
        <span>{sub || "-"}</span>
      </span>
    );
  };

  // ==========================================================
  //  RENDER
  // ==========================================================
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* ---------------------------------------------------------------- */}
      {/* LEFT: 내 프로필 + 내가 업로드한 문서 */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        {/* 프로필 카드 */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="text-[14px] font-semibold text-gray-900">
                {user.nickname || "닉네임"}
              </div>
              <div className="text-[11px] text-gray-600 mt-3 leading-relaxed">
                <div>
                  전화번호 :{" "}
                  {currentUser?.phone || "010-0000-0000"}
                </div>
                <div className="mt-1">
                  이메일 : {currentUser?.email || "email@abc.com"}
                </div>
              </div>
            </div>

            <button
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-[12px] font-medium text-gray-700 hover:bg-gray-50"
              type="button"
              onClick={() => setIsModalOpen(true)}
            >
              프로필 편집
            </button>
          </div>
        </div>

        {/* 내가 업로드한 문서 헤더 */}
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold text-gray-700">
            내가 업로드한 문서
          </div>
          <button
            className="px-2 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-300 text-[11px] font-medium text-gray-700"
            type="button"
          >
            전체 삭제
          </button>
        </div>

        {/* 내가 업로드한 문서 리스트 */}
        <div className="flex flex-col gap-3">
          {myItemsFromState.length === 0 && (
            <div className="text-[12px] text-gray-400">
              업로드한 문서가 없습니다.
            </div>
          )}

          {myItemsFromState.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm p-3"
            >
              <div className="flex items-start gap-3">
                {/* 아이콘 */}
                <div className="w-[32px] h-[32px] flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-lg leading-none select-none">
                  📄
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-gray-900 truncate">
                    {doc.filename || "문서_001.pdf"}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {prettyBytes(doc.size || 0)} ·{" "}
                    {new Date(
                      doc.createdAt || Date.now()
                    ).toLocaleString()}
                  </div>
                </div>

                {/* 오른쪽 버튼들 */}
                <div className="flex flex-col gap-2 text-[11px] shrink-0">
                  <button
                    className="px-2 py-1 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
                    onClick={() => {
                      if (!doc.serverFileId) return;
                      window.open(
                        joinUrl(
                          `/download/${doc.serverFileId}/text`
                        ),
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                  >
                    다운로드
                  </button>

                  <button className="px-2 py-1 rounded-md bg-white border border-red-300 text-red-600 font-medium hover:bg-red-50">
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 프로필 편집 모달 */}
      <ProfileEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
        onSave={handleSaveProfile}
      />

      {/* ---------------------------------------------------------------- */}
      {/* RIGHT: 문서 검색 */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        {/* 상단: 검색 + 필터들 */}
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDownSearch}
              placeholder="제목 또는 카테고리로 검색…"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
            />
            <button
              onClick={clearFilters}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              필터 초기화
            </button>
          </div>

          {/* 주 카테고리 칩 */}
          {mainList.length > 0 && (
            <div className="flex flex-wrap items-start gap-2 text-[12px]">
              <button
                className={`px-2 py-1 rounded-md border ${
                  mainSel === ""
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                }`}
                onClick={() => onClickMain("")}
              >
                전체
              </button>

              {mainList.map((m) => (
                <button
                  key={m}
                  className={`px-2 py-1 rounded-md border ${
                    mainSel === m
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                  }`}
                  onClick={() => onClickMain(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* 부 카테고리 칩 */}
          {mainSel && subList.length > 0 && (
            <div className="flex flex-wrap items-start gap-2 text-[12px]">
              {subList.map((s) => (
                <button
                  key={s}
                  className={`px-2 py-1 rounded-md border ${
                    subSel.has(s)
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => onToggleSub(s)}
                  title={`${mainSel}/${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* 상태 / 페이지 이동 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px] text-gray-600">
            <div className="flex flex-wrap items-center gap-2 leading-none">
              <span className="w-[6px] h-[6px] rounded-full bg-pink-500 inline-block" />
              <span className="text-gray-700 font-medium">
                {loading ? "검색 중…" : `총 ${total}건`}
              </span>
              {mainSel && (
                <span className="text-gray-500">· 주 {mainSel}</span>
              )}
              {subSel.size > 0 && (
                <span className="text-gray-500">
                  · 부 {Array.from(subSel).join(", ")}
                </span>
              )}
              {q && (
                <span className="text-gray-500">
                  · “{q}”
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[12px] text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                이전
              </button>
              <span className="text-gray-500">
                {page} / {pageCount}
              </span>
              <button
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[12px] text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                disabled={page >= pageCount || loading}
                onClick={() =>
                  setPage((p) => Math.min(pageCount, p + 1))
                }
              >
                다음
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-[12px] px-3 py-2">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* 검색 결과 리스트 */}
        <div className="flex flex-col gap-4 pt-4">
          {loading && (
            <div className="text-[13px] text-gray-400 text-center py-6">
              🔍 검색 중입니다...
            </div>
          )}

          {!loading && visibleItems.length === 0 && !error && (
            <div className="text-[13px] text-gray-400 text-center py-6">
              조건에 맞는 문서가 없습니다.
            </div>
          )}

          {visibleItems.map((it) => (
            <div
              key={it.id}
              className="rounded-xl border border-gray-200 bg-white shadow-sm p-4"
            >
              {/* 상단: 파일 정보 */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <span className="text-[20px] leading-none select-none">
                      📄
                    </span>
                    <div className="min-w-0">
                      <div
                        className="text-[13px] font-semibold text-gray-900 truncate"
                        title={it.title || it.filename}
                      >
                        {it.title || it.filename}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {prettyBytes(it.size || 0)} ·{" "}
                        {new Date(
                          it.createdAt || Date.now()
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-medium">
                  <span className="inline-flex items-center rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-[2px]">
                    DB
                  </span>
                </div>
              </div>

              {/* 요약 / 태그 / 다운로드 */}
              {it.summary && (
                <div className="mt-3">
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[12px] text-gray-800 whitespace-pre-wrap break-words leading-relaxed max-h-40 overflow-auto">
                    {it.summary}
                  </pre>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {it.catPath && renderCatJoined(it.catPath)}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                    <button
                      className="px-2 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
                      onClick={() =>
                        saveText(
                          `${(it.filename || "summary").replace(
                            /\.[^.]+$/,
                            ""
                          )}_summary.txt`,
                          it.summary
                        )
                      }
                    >
                      요약 .txt
                    </button>
                    <button
                      className="px-2 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
                      onClick={() =>
                        savePdf(
                          `${(it.filename || "summary").replace(
                            /\.[^.]+$/,
                            ""
                          )}_summary.pdf`,
                          it.summary
                        )
                      }
                    >
                      요약 .pdf
                    </button>
                  </div>
                </div>
              )}

              {it.serverFileId && (
                <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                  <a
                    className="px-2 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium inline-block"
                    href={joinUrl(`/download/${it.serverFileId}/text`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    텍스트 받기
                  </a>

                  <a
                    className="px-2 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium inline-block"
                    href={joinUrl(`/download/${it.serverFileId}/json`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    JSON 받기
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}