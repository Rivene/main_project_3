import { prettyBytes, fileIcon, joinUrl, saveText, savePdf } from "../utils/uploadHelpers";

export default function ItemCard({
  it,
  onUpload,
  onCancel,
  onRemove,
  onTagClick,
}) {
  return (
    <article
      className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3"
      aria-live="polite"
    >
      {/* 상단 영역: 파일정보 + 상태뱃지 */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        {/* 파일 메타 */}
        <div className="min-w-0 flex-1">
          {/* 파일명 + 아이콘 */}
          <div className="flex items-start gap-2">
            <span className="text-[20px] leading-none select-none">
              {fileIcon(it.file.name)}
            </span>
            <div className="min-w-0">
              <div
                className="text-sm font-semibold text-gray-800 truncate"
                title={it.file.name}
              >
                {it.file.name}
              </div>
              {(it.file.webkitRelativePath || it.file._relPath) && (
                <div
                  className="text-[11px] text-gray-500 truncate"
                  title={
                    it.file.webkitRelativePath ||
                    it.file._relPath
                  }
                >
                  {it.file.webkitRelativePath || it._relPath}
                </div>
              )}
              <div className="text-[11px] text-gray-400">
                {prettyBytes(it.file.size)}
              </div>
            </div>
          </div>
        </div>

        {/* 상태 배지 */}
        <div className="text-xs font-medium">
          {it.status === "idle" && (
            <span className="inline-flex items-center rounded-md bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5">
              대기
            </span>
          )}
          {it.status === "uploading" && (
            <span className="inline-flex items-center rounded-md bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5">
              업로드 중
            </span>
          )}
          {it.status === "done" && (
            <span className="inline-flex items-center rounded-md bg-green-100 text-green-700 border border-green-200 px-2 py-0.5">
              완료
            </span>
          )}
          {it.status === "error" && (
            <span className="inline-flex items-center rounded-md bg-red-100 text-red-700 border border-red-200 px-2 py-0.5">
              오류
            </span>
          )}
        </div>
      </div>

      {/* 진행도 / 상태 액션들 */}
      {/* 업로드 상태에 따른 행동 버튼 */}
      <div className="flex flex-wrap gap-2 text-xs">
        {it.status === "idle" && (
          <button
            className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
            onClick={() => onUpload(it.id)}
          >
            업로드
          </button>
        )}

        {it.status === "uploading" && (
          <button
            className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
            onClick={() => onCancel(it.id)}
          >
            취소
          </button>
        )}

        {it.status === "done" && (
          <button
            className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
            onClick={() => onRemove(it.id)}
          >
            삭제
          </button>
        )}

        {it.status !== "uploading" && it.status !== "done" && (
          <button
            className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
            onClick={() => onRemove(it.id)}
          >
            삭제
          </button>
        )}
      </div>

      {/* 에러 메시지 */}
      {it.error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2">
          ⚠ {it.error}
        </div>
      )}

      {/* 업로드 완료 후 결과 */}
      {it.result && it.status === "done" && (
        <details className="open:mt-2" open>
          <summary className="cursor-pointer text-sm font-semibold text-gray-800 select-none">
            결과 보기
          </summary>

          {/* OCR 원본 JSON */}
          <div className="mt-2">
            <pre className="bg-gray-900 text-gray-100 text-[11px] rounded-lg p-3 max-h-48 overflow-auto leading-relaxed">
              {JSON.stringify(it.result.ocr, null, 2)}
            </pre>
          </div>

          {/* 요약 / 태그 / 다운로드 */}
          <div className="mt-4 space-y-3">
            {/* 요약 텍스트 */}
            <div>
              <div className="text-xs font-semibold text-gray-800 mb-1">
                요약
              </div>
              <pre className="bg-gray-50 border border-gray-200 text-[12px] text-gray-800 rounded-lg p-3 whitespace-pre-wrap break-words leading-relaxed max-h-40 overflow-auto">
                {it.result.summary || ""}
              </pre>
            </div>

            {/* 태그들 */}
            {it.result.tags?.length > 0 && (
              <div>
                <div className="text-[11px] text-gray-500 font-medium mb-1">
                  태그
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {it.result.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200 hover:bg-gray-200"
                      onClick={() => onTagClick?.(t)}
                      title="이 태그로 검색"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 요약 다운로드 버튼들 */}
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
                onClick={() =>
                  saveText(
                    `${(it.file.name || "summary").replace(
                      /\.[^.]+$/,
                      ""
                    )}_summary.txt`,
                    it.result.summary || ""
                  )
                }
              >
                요약 .txt
              </button>
              <button
                className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
                onClick={() =>
                  savePdf(
                    `${(it.file.name || "summary").replace(
                      /\.[^.]+$/,
                      ""
                    )}_summary.pdf`,
                    it.result.summary || ""
                  )
                }
              >
                요약 .pdf
              </button>
            </div>

            {/* 서버에서 받은 결과 다운로드 */}
            {it.result.serverFileId ? (
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 text-xs">
                <a
                  className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium inline-block"
                  href={joinUrl(
                    `/download/${it.result.serverFileId}/text`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  텍스트 받기
                </a>
                <a
                  className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium inline-block"
                  href={joinUrl(
                    `/download/${it.result.serverFileId}/json`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  JSON 받기
                </a>
              </div>
            ) : (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 text-yellow-700 text-[11px] px-3 py-2">
                서버 파일 ID가 없어 다운로드 링크를 만들지 못했습니다.
              </div>
            )}
          </div>
        </details>
      )}
    </article>
  );
}