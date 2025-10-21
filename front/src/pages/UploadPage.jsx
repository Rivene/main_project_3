import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ocrFile } from '../services/api';
import Sidebar from '../components/Sidebar';
import UploadHome from '../components/UploadHome';
import DbSearchPane from '../components/DbSearchPane';
import { extractFilesFromDataTransfer } from '../utils/uploadHelpers';
import {
  ACCEPT_EXT, MAX_SIZE_MB,
  prettyBytes, extractServerFileId, parseCategoriesFromSummary, categorize
} from '../utils/uploadHelpers';
import '../styles/upload.css';

export default function UploadPage() {
  const [items, setItems] = useState([]); // {id, file, status, progress, error, controller, result}
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const dirInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState(() => new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const el = dirInputRef.current;
    if (el) {
      el.setAttribute('webkitdirectory', '');
      el.setAttribute('directory', '');
      el.setAttribute('mozdirectory', '');
      el.setAttribute('allowdirs', '');
      el.setAttribute('multiple', '');
    }
  }, []);

  const acceptAttr = useMemo(() => [...ACCEPT_EXT, 'application/pdf'].join(','), []);

  const validate = (file) => {
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPT_EXT.includes(ext)) return `허용되지 않은 확장자 (${ext})`;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `파일이 너무 큽니다 (${prettyBytes(file.size)} > ${MAX_SIZE_MB} MB)`;
    return null;
  };

  const addFiles = useCallback((files) => {
    if (!files?.length) return;
    setItems((prev) => {
      const seenPrev = new Set(
        prev.map(it => {
          const f = it.file || {};
          const rel = f.webkitRelativePath || f._relPath || "";
          return `${rel}::${f.name}:${f.size}:${f.lastModified || 0}`;
        })
      );
      const toAdd = [];
      for (const file of files) {
        const rel = file.webkitRelativePath || file._relPath || "";
        const key = `${rel}::${file.name}:${file.size}:${file.lastModified || 0}`;
        if (seenPrev.has(key)) continue;

        const err = validate(file);
        toAdd.push({
          id: crypto.randomUUID(),
          file, status: err ? 'error' : 'idle', progress: 0,
          error: err, controller: null, result: null,
        });
      }
      return toAdd.length ? [...toAdd, ...prev] : prev;
    });
  }, []);

  // 드래그&드롭: 폴더 재귀는 기존 함수 그대로 써도 됨 (여기선 간소화)
  const onDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    try {
        const files = await extractFilesFromDataTransfer(e.dataTransfer);
        // 폴더째 드롭해도 내부 pdf만 들어오게 됨
        if (files?.length) addFiles(files);
    } catch (err) {
        console.error(err);
    }
    };

  const onStartAll = useCallback(async () => {
    const queue = items.filter(it => it.status === 'idle').map(it => it.id);
    if (queue.length === 0) return;
    let active = 0, idx = 0, MAX_CONCURRENCY = 6;
    const kick = () => {
      while (active < MAX_CONCURRENCY && idx < queue.length) {
        const id = queue[idx++]; active++;
        Promise.resolve(startUpload(id)).finally(() => { active--; kick(); });
      }
    };
    kick();
  }, [items]);

  const startUpload = useCallback(async (id) => {
    const cur = items.find(it => it.id === id);
    if (!cur || cur.error) return;
    if (cur.status === 'uploading' || cur.status === 'done') return;

    const controller = new AbortController();
    setItems(prev => prev.map(it => it.id === id ? { ...it, status: 'uploading', progress: 0, controller } : it));
    try {
      const ocrRes = await ocrFile({
        file: cur.file,
        params: { dpi: 300, prep: 'adaptive', langs: 'kor+eng', psm: 6, do_llm_summary: true, llm_model: 'gemma3-summarizer' },
        signal: controller.signal,
      });
      const serverFileId = extractServerFileId(ocrRes);
      const summary = ocrRes?.llmSummary || "";
      let tags = parseCategoriesFromSummary(summary);
      if (tags.length === 0) tags = categorize(summary || JSON.stringify(ocrRes || {}));

      setItems(prev => prev.map(it => it.id === id ? ({
        ...it, status: 'done', progress: 100, controller: null, result: { ocr: ocrRes, serverFileId, summary, tags }
      }) : it));
    } catch (err) {
      setItems(prev => prev.map(it => it.id === id ? ({ ...it, status: 'error', controller: null, error: err.message }) : it));
    }
  }, [items]);

  const onCancel = (id) => {
    const ctrl = items.find(it => it.id === id)?.controller; if (ctrl) ctrl.abort();
    setItems(prev => prev.map(it => it.id === id ? ({ ...it, status: 'idle', controller: null, progress: 0 }) : it));
  };
  const onRemove = (id) => setItems(prev => prev.filter(it => it.id !== id));

  const totalSizeStr = useMemo(
    () => prettyBytes(items.reduce((s, it) => s + (it.file?.size || 0), 0)),
    [items]
  );

  // 검색/필터
  const allCategories = useMemo(() => {
    const s = new Set();
    for (const it of items) (it?.result?.tags || []).forEach(t => s.add(t));
    return Array.from(s).sort();
  }, [items]);

  const toggleCat = (cat) => setSelectedCats(prev => {
    const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n;
  });
  const clearFilters = () => { setSearchQuery(''); setSelectedCats(new Set()); };
  const normalized = (v) => String(v || '').toLowerCase();

  const filteredItems = useMemo(() => {
    const q = normalized(searchQuery);
    const need = Array.from(selectedCats);
    return items.filter(it => {
      const tags = it?.result?.tags || [];
      if (!need.every(c => tags.includes(c))) return false;
      if (!q) return true;
      const hay = [it.file?.name || '', it?.result?.summary || '', tags.join(' ')].map(normalized).join(' ');
      return hay.includes(q);
    });
  }, [items, searchQuery, selectedCats]);

  const onItemTagClick = (tag) => { setActiveTab('search'); toggleCat(tag); };

  // 파일 선택 input 연결 (Home 내부 버튼에서 클릭만 함)
  useEffect(() => {
    const input = inputRef.current;
    const dir = dirInputRef.current;
    const handler = (e) => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ''; } };
    input?.addEventListener('change', handler);
    dir?.addEventListener('change', handler);
    return () => {
      input?.removeEventListener('change', handler);
      dir?.removeEventListener('change', handler);
    };
  }, [addFiles]);

  return (
    <div className={`layout ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        categories={allCategories}
        selectedCats={selectedCats}
        toggleCat={toggleCat}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <main className="u-main">
        <header className="u-header">
          <h1 className="u-title">{activeTab === 'home' ? '문서 업로드' : '문서 검색'}</h1>
          {activeTab === 'home' && (
            <div className="u-accept">허용 확장자:<span className="chip">PDF </span></div>
          )}
        </header>

        {activeTab === 'home' ? (
          <UploadHome
            items={items}
            totalSize={totalSizeStr}
            dragOver={dragOver}
            onDrop={(e)=>{ e.preventDefault(); setDragOver(false); onDrop(e); }}
            onStartAll={onStartAll}
            onUpload={startUpload}
            onCancel={onCancel}
            onRemove={onRemove}
            inputRef={inputRef}
            dirInputRef={dirInputRef}
            acceptAttr={acceptAttr}
          />
        ) : (
          <DbSearchPane 
            items={items}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            allCategories={allCategories}
            selectedCats={selectedCats}
            toggleCat={toggleCat}
            filteredItems={filteredItems}
            onItemTagClick={onItemTagClick}
            onUpload={startUpload}
            onCancel={onCancel}
            onRemove={onRemove}
            clearFilters={clearFilters}
          />
        )}
      </main>
    </div>
  );
}