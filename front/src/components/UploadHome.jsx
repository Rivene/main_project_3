import ItemCard from './ItemCard';

export default function UploadHome({
  items, totalSize, dragOver,
  onDrop, onStartAll, onUpload, onCancel, onRemove,
  inputRef, dirInputRef, acceptAttr
}) {
  return (
    <>
      <div
        className={`u-drop ${dragOver ? 'is-over' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect='copy'; }}
        onDragLeave={() => {}}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="파일/폴더 드래그&드롭 또는 클릭하여 업로드"
      >
        <div className="u-drop-inner">
          <div className="u-icon">⬆</div>
          <div className="u-heading">드래그&드롭 또는 클릭하여 업로드</div>
          <div className="u-sub">여러 파일이나 폴더를 한 번에 선택할 수 있어요</div>
          <div className="u-drop-actions">
            <button className="u-btn ghost" type="button" onClick={() => inputRef.current?.click()}>파일 선택</button>
            <button className="u-btn ghost" type="button" onClick={() => dirInputRef.current?.click()}>폴더 선택</button>
          </div>
          <input ref={dirInputRef} type="file" multiple style={{ display: 'none' }}
             webkitdirectory="true" directory="true" />
          <input ref={dirInputRef} type="file" multiple style={{ display: 'none' }} />
        </div>
      </div>

      {items.length > 0 && (
        <div className="u-toolbar">
          <div className="u-summary"><span className="dot" />{items.length}개 · {totalSize}</div>
          <div className="u-actions-inline">
            <button className="u-btn primary" onClick={onStartAll}>전체 업로드</button>
          </div>
        </div>
      )}

      <div className="u-list">
        {items.map((it) => (
          <ItemCard
            key={it.id}
            it={it}
            onUpload={onUpload}
            onCancel={onCancel}
            onRemove={onRemove}
            onTagClick={(tag) => {/* 상위에서 탭 전환/필터 처리 */}}
          />
        ))}
      </div>
    </>
  );
}