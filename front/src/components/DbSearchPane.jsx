import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { joinUrl, prettyBytes, saveText, savePdf } from '../utils/uploadHelpers';
import { searchDocuments, getCategories } from '../services/api'; // 추가

const CLIENT_PAGING_THRESHOLD = 2000;
const SERVER_MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export default function DbSearchPane() {
  // 검색어
  const [q, setQ] = useState("");

  // 목록/페이징
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [allMode, setAllMode] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0);

  // 🔹 카테고리 마스터(불변 소스) + 결과 기반 보조 소스
  const [catsMaster, setCatsMaster] = useState([]); // ['법률/행정', '경제/금융', ...] — 항상 전체
  const [catsRaw, setCatsRaw] = useState([]);       // 결과 기준(폴백용)

  // 선택 상태
  const [mainSel, setMainSel] = useState("");
  const [subSel, setSubSel] = useState(new Set());

  // ===== 유틸 =====
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
      return Array.from(new Set(
        res.categories.map(String).map(s => s.trim()).filter(s => s.includes('/'))
      )).sort();
    }
    return Array.from(new Set(
      (mapped || []).map(it => it.catPath).filter(Boolean).filter(s => s.includes('/'))
    )).sort();
  };

  // ===== 카테고리 트리 (항상 마스터 우선) =====
  const catSource = catsMaster.length > 0 ? catsMaster : catsRaw; // 마스터 없을 때만 폴백
  const catTree = useMemo(() => {
    const map = new Map();
    (catSource || []).forEach((j) => {
      const [m, s] = String(j).split('/');
      if (!m || !s) return;
      if (!map.has(m)) map.set(m, new Set());
      map.get(m).add(s);
    });
    return map;
  }, [catSource]);

  const mainList = useMemo(() => Array.from(catTree.keys()).sort(), [catTree]);
  const subList  = useMemo(() => {
    if (!mainSel) return [];
    return Array.from(catTree.get(mainSel) || []).sort();
  }, [catTree, mainSel]);

  // ===== 전송용 카테고리 =====
  const categoriesToSend = useMemo(() => {
    if (subSel.size > 0 && mainSel) {
      return Array.from(subSel).map((s) => `${mainSel}/${s}`);
    }
    if (mainSel && catTree.has(mainSel)) {
      return Array.from(catTree.get(mainSel)).map((s) => `${mainSel}/${s}`);
    }
    return [];
  }, [mainSel, subSel, catTree]);

  // ===== 표시 목록 =====
  const visibleItems = useMemo(() => {
    if (!allMode) return items;
    const start = (page - 1) * pageSize;
    return allItems.slice(start, start + pageSize);
  }, [allMode, items, allItems, page, pageSize]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // ===== 초기: 카테고리 마스터 로드 =====
  useEffect(() => {
    (async () => {
      try {
        const res = await getCategories(); // { categories:[{catPath,...}], mains:[...] }
        const joined = Array.from(new Set(
          (res?.categories || [])
            .map((o) => o?.catPath)
            .filter(Boolean)
        )).sort();
        setCatsMaster(joined);
      } catch (e) {
        console.warn("[categories] load failed, will fallback to search-derived cats", e);
        // 마스터 실패 시 검색 결과에서 catsRaw로라도 구성됨 (아래 doSearch에서)
      }
    })();
  }, []);

  // ===== 검색 =====
  const doSearch = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 총 개수 파악
      const head = await searchDocuments({
        q,
        categories: categoriesToSend,
        page: 1,
        pageSize: 1,
      });
      const totalCount = head?.total ?? 0;

      if (totalCount > 0 && totalCount <= CLIENT_PAGING_THRESHOLD) {
        // 전체 수집(서버 제한 100씩)
        const pages = Math.max(1, Math.ceil(totalCount / SERVER_MAX_PAGE_SIZE));
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

          // 결과 기반 카테고리는 폴백용으로만 보관(마스터가 없을 때만 사용)
          extractJoinedCats(chunk, mappedChunk).forEach((c) => catsSet.add(c));
        }

        // 키워드 필터(파일명/카테고리만)
        const qTrim = q.trim().toLowerCase();
        const afterFilter = !qTrim
          ? acc
          : acc.filter((it) => {
              const name = (it.title || it.filename || "").toLowerCase();
              const cat  = (it.catPath || "").toLowerCase();
              return name.includes(qTrim) || cat.includes(qTrim);
            });

        setAllItems(afterFilter);
        setItems([]);
        setAllMode(true);
        setTotal(afterFilter.length);

        // 마스터가 아직 없을 때만 catsRaw를 세팅(트리 폴백용)
        if (catsMaster.length === 0) {
          setCatsRaw(Array.from(catsSet).sort());
        }
      } else {
        // 서버 페이징
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
              const cat  = (it.catPath || "").toLowerCase();
              return name.includes(qTrim) || cat.includes(qTrim);
            });

        setItems(afterFilter);
        setAllItems([]);
        setAllMode(false);
        setTotal(pageRes.total ?? afterFilter.length);

        // 마스터 없을 때만 결과 기반 폴백 셋팅
        if (catsMaster.length === 0) {
          setCatsRaw(extractJoinedCats(pageRes, mapped));
        }
      }
    } catch (e) {
      setError(e?.message || "검색 중 오류");
      setItems([]); setAllItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, categoriesToSend, page, catsMaster.length]);

  // ===== 초기 전체 검색 트리거 =====
  useEffect(() => { setSearchTrigger(n => n + 1); }, []);
  useEffect(() => { if (searchTrigger) doSearch(); }, [searchTrigger]);
  useEffect(() => { if (searchTrigger && !allMode) doSearch(); }, [page]); // 서버 페이징만 재호출

  // ===== 인터랙션 =====
  const onKeyDownSearch = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setPage(1);
      setSearchTrigger(n => n + 1);
    }
  };

  const onClickMain = (m) => {
    setMainSel(prev => (prev === m ? "" : m));
    setSubSel(new Set()); // 주 변경 시 부 초기화
    setPage(1);
    setSearchTrigger(n => n + 1);
  };

  const onToggleSub = (s) => {
    setSubSel(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
    setPage(1);
    setSearchTrigger(n => n + 1);
  };

  const clearFilters = () => {
    setQ("");
    setMainSel("");
    setSubSel(new Set());
    setPage(1);
    setItems([]); setAllItems([]); setTotal(0);
    setSearchTrigger(n => n + 1);
    // ❌ catsMaster는 건드리지 않음 — 항상 전체 유지!
  };

  const renderCatJoined = (catPath) => {
    if (!catPath) return null;
    const [main, sub] = String(catPath).split("/");
    return (
      <span className="cat-chip">
        <span className="cat-main">{main || "-"}</span>
        <span className="cat-sep"> · </span>
        <span className="cat-sub">{sub || "-"}</span>
      </span>
    );
  };

  // ===== 렌더 =====
  return (
    <section className="u-search">
      <div className="u-searchbar">
        <input
          className="u-input"
          type="search"
          placeholder="파일명 또는 카테고리로 검색…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDownSearch}
          aria-label="문서 검색"
        />
        <button className="u-btn ghost" onClick={clearFilters}>필터 초기화</button>
      </div>

      {/* 주카테고리 (항상 마스터 기준) */}
      {mainList.length > 0 && (
        <div className="u-filter-row">
          <div className="u-filter-label">주카테고리</div>
          <div className="u-filter-chips">
            {mainList.map((m) => (
              <button
                key={m}
                className={`chip ${mainSel === m ? 'chip-on' : ''}`}
                onClick={() => onClickMain(m)}
                title={m}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 부카테고리 (주 선택 시 마스터에서 파생) */}
      {mainSel && subList.length > 0 && (
        <div className="u-filter-row">
          <div className="u-filter-label">부카테고리</div>
          <div className="u-filter-chips">
            {subList.map((s) => (
              <button
                key={s}
                className={`chip ${subSel.has(s) ? 'chip-on' : ''}`}
                onClick={() => onToggleSub(s)}
                title={`${mainSel}/${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="u-toolbar">
        <div className="u-summary">
          <span className="dot" />
          {loading ? '검색 중…' : `결과 ${total}개`}
          {mainSel && <span className="u-sub">&nbsp;· 주: {mainSel}</span>}
          {subSel.size > 0 && <span className="u-sub">&nbsp;· 부: {Array.from(subSel).join(', ')}</span>}
          {q && <span className="u-sub">&nbsp;· 키워드: “{q}”</span>}
        </div>
        <div className="u-actions-inline">
          <button className="u-btn ghost" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>이전</button>
          <span className="u-sub"> {page} / {pageCount} </span>
          <button className="u-btn ghost" disabled={page >= pageCount || loading} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>다음</button>
        </div>
      </div>

      {error && <div className="u-alert error">⚠ {error}</div>}

      <div className="u-list">
        {loading && <div className="u-empty">🔍 검색 중입니다...</div>}
        {!loading && visibleItems.length === 0 && !error && (
          <div className="u-empty">조건에 맞는 문서가 없습니다.</div>
        )}

        {visibleItems.map((it) => (
          <article key={it.id} className="u-card">
            <div className="u-row">
              <div className="u-meta">
                <div className="u-file">
                  <span className="u-file-icon">📄</span>
                  <span className="u-name" title={it.title || it.filename}>
                    {it.title || it.filename}
                  </span>
                </div>
                <div className="u-sub">
                  {prettyBytes(it.size || 0)} · {new Date(it.createdAt || Date.now()).toLocaleString()}
                </div>
              </div>
              <div className="u-badges"><span className="u-badge">DB</span></div>
            </div>

            {it.summary && (
              <div className="u-llm" style={{ marginTop: 8 }}>
                <pre className="u-summary-box">{it.summary}</pre>
                {it.catPath && (
                  <div className="u-tags">
                    <span className="chip">{renderCatJoined(it.catPath)}</span>
                  </div>
                )}
                <div className="u-downloads">
                  <button className="u-btn" onClick={() => saveText(`${(it.filename||'summary').replace(/\.[^.]+$/, '')}_summary.txt`, it.summary)}>요약 .txt</button>
                  <button className="u-btn" onClick={() => savePdf(`${(it.filename||'summary').replace(/\.[^.]+$/, '')}_summary.pdf`, it.summary)}>요약 .pdf</button>
                </div>
              </div>
            )}

            {it.serverFileId && (
              <div className="u-downloads">
                <a href={joinUrl(`/download/${it.serverFileId}/text`)} target="_blank" rel="noopener noreferrer">텍스트 받기</a>
                <a href={joinUrl(`/download/${it.serverFileId}/json`)} target="_blank" rel="noopener noreferrer">JSON 받기</a>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}