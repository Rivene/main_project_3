import { prettyBytes, fileIcon, joinUrl, saveText, savePdf } from '../utils/uploadHelpers';

export default function ItemCard({ it, onUpload, onCancel, onRemove, onTagClick }) {
  return (
    <article className="u-card" aria-live="polite">
      <div className="u-row">
        <div className="u-meta">
          <div className="u-file">
            <span className="u-file-icon">{fileIcon(it.file.name)}</span>
            <span className="u-name" title={it.file.name}>{it.file.name}</span>
          </div>
          {(it.file.webkitRelativePath || it.file._relPath) && (
            <div className="u-path" title={it.file.webkitRelativePath || it.file._relPath}>
              {it.file.webkitRelativePath || it._relPath}
            </div>
          )}
          <div className="u-sub">{prettyBytes(it.file.size)}</div>
        </div>

        <div className="u-badges">
          {it.status === 'idle' && <span className="u-badge">대기</span>}
          {it.status === 'uploading' && <span className="u-badge warn">업로드 중</span>}
          {it.status === 'done' && <span className="u-badge ok">완료</span>}
          {it.status === 'error' && <span className="u-badge error">오류</span>}
        </div>
      </div>

      <div className="u-actions">
        {it.status === 'idle' && <button className="u-btn" onClick={() => onUpload(it.id)}>업로드</button>}
        {it.status === 'uploading' && <button className="u-btn danger" onClick={() => onCancel(it.id)}>취소</button>}
        {it.status === 'done' && <button className="u-btn ghost" onClick={() => onRemove(it.id)}>삭제</button>}
        {it.status !== 'uploading' && it.status !== 'done' && (
          <button className="u-btn ghost" onClick={() => onRemove(it.id)}>삭제</button>
        )}
      </div>

      {it.error && <div className="u-alert error">⚠ {it.error}</div>}

      {it.result && it.status === 'done' && (
        <details className="u-result" open>
          <summary>결과 보기</summary>

          <pre className="u-json">{JSON.stringify(it.result.ocr, null, 2)}</pre>

          <div className="u-llm">
            <h4>요약</h4>
            <pre className="u-summary-box">{it.result.summary || ""}</pre>

            {it.result.tags?.length > 0 && (
              <div className="u-tags">
                {it.result.tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="chip"
                    onClick={() => onTagClick?.(t)}
                    title="이 태그로 검색"
                  >{t}</button>
                ))}
              </div>
            )}

            <div className="u-downloads">
              <button
                className="u-btn"
                onClick={() => saveText(`${(it.file.name || 'summary').replace(/\.[^.]+$/, '')}_summary.txt`, it.result.summary || "")}
              >요약 .txt</button>
              <button
                className="u-btn"
                onClick={() => savePdf(`${(it.file.name || 'summary').replace(/\.[^.]+$/, '')}_summary.pdf`, it.result.summary || "")}
              >요약 .pdf</button>
            </div>
          </div>

          {it.result.serverFileId ? (
            <div className="u-downloads">
              <a href={joinUrl(`/download/${it.result.serverFileId}/text`)} target="_blank" rel="noopener noreferrer">텍스트 받기</a>
              <a href={joinUrl(`/download/${it.result.serverFileId}/json`)} target="_blank" rel="noopener noreferrer">JSON 받기</a>
            </div>
          ) : (
            <div className="u-alert">서버 파일 ID가 없어 다운로드 링크를 만들지 못했습니다.</div>
          )}
        </details>
      )}
    </article>
  );
}