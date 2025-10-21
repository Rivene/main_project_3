export const API_BASE = import.meta.env?.VITE_API_BASE || "http://127.0.0.1:4000";
export const joinUrl = (path) => (path.startsWith("http") ? path : `${API_BASE}${path}`);

export const ACCEPT_EXT = ['.pdf'];
export const MAX_SIZE_MB = 80;

export function prettyBytes(n) {
  if (n === 0) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${(n / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
export function fileIcon(name='') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return ext === 'pdf' ? '📄' : '🗂️';
}
export function extractServerFileId(ocrRes) {
  if (ocrRes?.id) return ocrRes.id;
  const outDir = ocrRes?.outDir || ocrRes?.outdir || "";
  if (outDir) {
    try { return outDir.replace(/[/\\]+$/, "").split(/[/\\]/).pop(); } catch {}
  }
  return null;
}
export function parseCategoriesFromSummary(summary = "") {
  if (!summary) return [];
  const re = /(?:^|\n)\s*(?:카테고리|분류|Category|Tags?)\s*[:：]\s*(.+)\s*$/gim;
  let m, last = null;
  while ((m = re.exec(summary)) !== null) last = m;
  if (!last) return [];
  let rhs = (last[1] || "").replace(/^[\[\(]+|[\]\)]+$/g, "").trim();
  let parts = rhs.split(/[,\|/·•>]+/).map(s => s.trim()).filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 8);
}
export function categorize(text="") {
  const cats = new Set(), add=(c)=>cats.add(c);
  if (/(법률|심사보고|의결|위원회|법안|국회)/i.test(text)) add("법률/행정");
  if (/(농림|축산|수산|해양|어업|농업)/i.test(text)) add("농림축수산");
  if (/(예산|비용|원가|금액|억원|조원|회계|기금)/i.test(text)) add("재정/예산");
  if (/(프로젝트|시스템|플랫폼|ai|ocr|모델|데이터)/i.test(text)) add("IT/프로젝트");
  if (/(안전|품질|인증|규정|정책)/i.test(text)) add("정책/규정");
  if (/(보고서|요약|결론|결과)/i.test(text)) add("보고/결과");
  if (!cats.size) add("일반");
  return Array.from(cats);
}
export function saveText(filename, content) {
  const blob = new Blob([content ?? ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
}

// === 폰트 임베드 PDF (네 코드 그대로) ===
let _jspdfLoaded=false, _krFontB64=null;
const ab2b64=(buf)=>{ let s=''; const b=new Uint8Array(buf); for (let i=0;i<b.byteLength;i++) s+=String.fromCharCode(b[i]); return btoa(s); };
async function ensureJsPDF(){
  if (_jspdfLoaded) return;
  await new Promise((res, rej) => {
    const s=document.createElement('script');
    s.src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
    s.onload=()=>res(); s.onerror=()=>rej(new Error("jsPDF 로딩 실패"));
    document.head.appendChild(s);
  }); _jspdfLoaded=true;
}
function fontUrl(name="NotoSansKR-Regular.ttf"){
  const base=(import.meta.env.BASE_URL || "/").replace(/\/+$/,"");
  return `${base}/fonts/${name}`;
}
async function loadKoreanFontB64(){
  if (_krFontB64) return _krFontB64;
  const resp=await fetch(fontUrl("NotoSansKR-Regular.ttf"));
  if (!resp.ok) throw new Error("한글 폰트 로딩 실패");
  const buf=await resp.arrayBuffer(); _krFontB64=ab2b64(buf); return _krFontB64;
}
export async function savePdf(filename, text){
  await ensureJsPDF(); const { jsPDF } = window.jspdf;
  const fontB64=await loadKoreanFontB64();
  const doc=new jsPDF({ unit:"pt", format:"a4" });
  const vfs='NotoSansKR-Regular.ttf', name='NotoSansKR';
  doc.addFileToVFS(vfs, fontB64); doc.addFont(vfs, name, 'normal');
  doc.setFont(name,'normal'); doc.setFontSize(12);
  const margin=48, pageW=595.28, pageH=841.89, maxW=pageW-margin*2;
  const lines=doc.splitTextToSize(String(text||""), maxW); let y=margin;
  for (const line of lines){
    if (y>pageH-margin){ doc.addPage(); doc.setFont(name,'normal'); doc.setFontSize(12); y=margin; }
    doc.text(line, margin, y); y+=18;
  }
  doc.save(filename.endsWith('.pdf')?filename:`${filename}.pdf`);
}

// ===== 폴더/엔트리 재귀 파서 =====
const ALLOW_SET = new Set(['.pdf']);
const extOf = (name="") => (/\.[^.]+$/.exec((name||'').toLowerCase()) || [''])[0];

async function pushWithRel(file, rel, out){
  try { Object.defineProperty(file, "_relPath", { value: rel, enumerable:false }); }
  catch { file._relPath = rel; }
  if (ALLOW_SET.has(extOf(file.name))) out.push(file);
}

async function walkFsHandle(handle, prefix = "", out = []) {
  if (handle.kind === "file") {
    const file = await handle.getFile();
    await pushWithRel(file, `${prefix}${handle.name}`, out);
  } else if (handle.kind === "directory") {
    for await (const [, child] of handle.entries()) {
      await walkFsHandle(child, `${prefix}${handle.name}/`, out);
    }
  }
  return out;
}
async function walkEntry(entry, out = [], base = "") {
  if (entry.isFile) {
    await new Promise((res) => entry.file(async (f) => {
      const rel = (entry.fullPath || base + entry.name || "").replace(/^\/+/, "");
      await pushWithRel(f, rel, out);
      res();
    }));
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const readBatch = () => new Promise((res) => reader.readEntries(res));
    while (true) {
      const entries = await readBatch();
      if (!entries || entries.length === 0) break;
      for (const e of entries) await walkEntry(e, out, (entry.fullPath || "") + "/");
    }
  }
  return out;
}

export async function extractFilesFromDataTransfer(dt) {
  const out = [];
  // 최신 File System Access API
  if (dt.items && dt.items.length && dt.items[0].getAsFileSystemHandle) {
    const tasks = [];
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item.kind !== "file") continue;
      tasks.push((async () => {
        const handle = await item.getAsFileSystemHandle();
        return walkFsHandle(handle, "", []);
      })());
    }
    const batches = await Promise.all(tasks);
    batches.forEach(arr => out.push(...arr));
  } else {
    // 구형 webkit 엔트리
    if (dt.items && dt.items.length) {
      for (let i = 0; i < dt.items.length; i++) {
        const item = dt.items[i];
        const entry = item.webkitGetAsEntry?.();
        if (!entry) continue;
        if (entry.isDirectory) {
          const files = await walkEntry(entry, []);
          out.push(...files);
        } else if (entry.isFile) {
          const f = item.getAsFile?.();
          if (f) await pushWithRel(f, f.name, out);
        }
      }
    }
    // 순수 파일 리스트
    if (dt.files && dt.files.length) {
      for (const f of Array.from(dt.files)) {
        await pushWithRel(f, f.webkitRelativePath || f.name, out);
      }
    }
  }
  // 중복 제거
  const seen = new Set();
  const dedup = [];
  for (const f of out) {
    const rel = f.webkitRelativePath || f._relPath || "";
    const key = `${rel}::${f.name}:${f.size}:${f.lastModified || 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(f);
  }
  return dedup;
}