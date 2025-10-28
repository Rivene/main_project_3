import ItemCard from "./ItemCard";

export default function UploadHome({
  items,
  dragOver,
  setDragOver,
  onDrop,
  onStartAll,
  onUpload,
  onCancel,
  onRemove,
  inputRef,
  dirInputRef,
  acceptAttr,
  onDownloadAllZip,
}) {
  // 전체 진행도 (placeholder)
  const overallProgressPct = (() => {
    const total = items.length;
    if (!total) return 0;
    const doneOrUploading = items.filter(
      (it) => it.status === "done" || it.status === "uploading"
    ).length;
    return Math.round((doneOrUploading / total) * 100);
  })();

  return (
    <section className="space-y-6">
      {/* 일괄 업로드 영역 */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="px-3 py-2 rounded-lg text-white text-sm font-semibold bg-gradient-to-r from-[#FF54A1] to-[#B862FF] hover:opacity-90"
          onClick={onStartAll}
        >
          전체 업로드 시작
        </button>

        {/* 전체 ZIP 다운로드 */}
        <button
          className="px-3 py-2 rounded-lg text-white text-sm font-semibold bg-gradient-to-r from-[#FF54A1] to-[#B862FF] hover:opacity-90"
          onClick={onDownloadAllZip}
        >
          결과 ZIP
        </button>

        <span className="text-[11px] text-gray-500 leading-tight">
          선택/드래그한 파일들은 아직 서버에 업로드되지 않았습니다.
          <br className="hidden sm:block" />
          "전체 업로드 시작"을 누르면 변환·요약·분류가 실행되고,
          완료된 문서는 ZIP으로 내려받을 수 있습니다.
        </span>

        {/* 숨겨진 input들 */}
        <input
          type="file"
          multiple
          accept={acceptAttr}
          ref={inputRef}
          className="hidden"
        />
        <input
          type="file"
          multiple
          ref={dirInputRef}
          className="hidden"
        />
      </div>

      {/* 전체 진행도 바 */}
      {items.length > 0 && (
        <div className="w-full max-w-xl">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>전체 진행도</span>
            <span>{overallProgressPct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FF54A1] to-[#B862FF] transition-all"
              style={{ width: `${overallProgressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* 드롭존 */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition
          ${
            dragOver
              ? "border-[#B862FF] bg-purple-50/30"
              : "border-gray-300 bg-white"
          }
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="text-gray-700 text-sm font-medium">
          여기에 문서/ZIP/폴더를 드래그해서 추가하세요
        </div>
        <div className="text-gray-400 text-xs mt-1 leading-relaxed">
          지원: PDF · HWP/HWPX · DOC/DOCX · PPT/PPTX · XLS/XLSX · ZIP<br/>
          ZIP은 자동으로 풀어서 안의 문서들도 추가됩니다.
        </div>
        <div className="text-gray-400 text-[11px] mt-1">
          또는 아래 버튼으로 선택할 수 있습니다.
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm">
          <button
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
            onClick={() => {
              if (inputRef.current) inputRef.current.click();
            }}
          >
            파일 선택
          </button>
          <button
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
            onClick={() => {
              if (dirInputRef.current) dirInputRef.current.click();
            }}
          >
            폴더 선택
          </button>
        </div>
      </div>

      {/* 업로드된 아이템 리스트 */}
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-sm text-gray-400">
            아직 추가된 문서가 없습니다.
          </div>
        )}

        {items.map((it) => (
          <ItemCard
            key={it.id}
            it={it}
            onUpload={onUpload}
            onCancel={onCancel}
            onRemove={onRemove}
            onTagClick={(tag) => {
              // tag 눌렀을 때 뭘 할지?
              // 예: 나중에 마이페이지 탭으로 전환하고 필터 태그 적용
              console.log("태그 클릭:", tag);
            }}
          />
        ))}
      </div>
    </section>
  );
}