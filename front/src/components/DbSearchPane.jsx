import React, { useEffect, useMemo, useState } from 'react';
import { joinUrl, prettyBytes, saveText, savePdf } from '../utils/uploadHelpers';
import { searchDocuments } from '../services/api';

export default function DbSearchPane() {
  const [q, setQ] = useState("");
  const [selectedCats, setSelectedCats] = useState(() => new Set());
  const [catsFromServer, setCatsFromServer] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleCat = (cat) => {
    setSelectedCats(prev => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });
    setPage(1);
  };
  const clearFilters = () => {
    setQ("");
    setSelectedCats(new Set());
    setPage(1);
  };

  // 디바운스 검색
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const res = await searchDocuments({
          q,
          categories: Array.from(selectedCats),
          page,
          pageSize,
        });
        if (!alive) return;
        setItems(res.items || []);
        setTotal(res.total ?? 0);
        // 서버가 카테고리 목록을 주면 반영, 아니면 결과에서 추출
        if (Array.isArray(res.categories)) setCatsFromServer(res.categories);
        else {
          const s = new Set();
          (res.items || []).forEach(it => (it.tags || []).forEach(t => s.add(t)));
          setCatsFromServer(Array.from(s).sort());
        }
      } catch (e) {
        if (alive) setError(e.message || "검색 중 오류");
      } finally {
        if (alive) setLoading(false);
      }
    }, 250); // 250ms 디바운스
    return () => { alive = false; clearTimeout(timer); };
  }, [q, selectedCats, page]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  return (
    <section className="u-search">
      <div className="u-searchbar">
        <input
          className="u-input"
          type="search"
          placeholder="파일명, 카테고리로 검색…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          aria-label="문서 검색"
        />
        <button className="u-btn ghost" onClick={clearFilters}>필터 초기화</button>
      </div>

      {catsFromServer.length > 0 && (
        <div className="u-filter-row">
          <div className="u-filter-label">카테고리</div>
          <div className="u-filter-chips">
            {catsFromServer.map((c) => (
              <button
                key={c}
                className={`chip ${selectedCats.has(c) ? 'chip-on' : ''}`}
                onClick={() => toggleCat(c)}
              >{c}</button>
            ))}
          </div>
        </div>
      )}

      <div className="u-toolbar">
        <div className="u-summary">
          <span className="dot" />
          {loading ? '검색 중…' : `결과 ${total}개`}
          {Array.from(selectedCats).length > 0 && (
            <span className="u-sub">&nbsp;· 필터: {Array.from(selectedCats).join(', ')}</span>
          )}
          {q && <span className="u-sub">&nbsp;· 키워드: “{q}”</span>}
        </div>
        <div className="u-actions-inline">
          {/* 페이지네이션 */}
          <button className="u-btn ghost" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>이전</button>
          <span className="u-sub"> {page} / {pageCount} </span>
          <button className="u-btn ghost" disabled={page >= pageCount || loading} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>다음</button>
        </div>
      </div>

      {error && <div className="u-alert error">⚠ {error}</div>}

      <div className="u-list">
        {items.map((it) => (
          <article key={it.id} className="u-card">
            <div className="u-row">
              <div className="u-meta">
                <div className="u-file">
                  <span className="u-file-icon">📄</span>
                  <span className="u-name" title={it.title || it.filename}>{it.title || it.filename}</span>
                </div>
                <div className="u-sub">
                  {prettyBytes(it.size || 0)} · {new Date(it.createdAt || Date.now()).toLocaleString()}
                </div>
              </div>
              <div className="u-badges">
                <span className="u-badge">DB</span>
              </div>
            </div>

            {it.summary && (
              <div className="u-llm" style={{ marginTop: 8 }}>
                <pre className="u-summary-box">{it.summary}</pre>
                {Array.isArray(it.tags) && it.tags.length > 0 && (
                  <div className="u-tags">
                    {it.tags.map(t => <span key={t} className="chip">{t}</span>)}
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

        {!loading && items.length === 0 && (
          <div className="u-empty">조건에 맞는 문서가 없습니다.</div>
        )}
      </div>
    </section>
  );
}