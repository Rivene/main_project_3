from __future__ import annotations
from pathlib import Path
import json
import shutil
try:
    from back.settings import settings  # type: ignore
except ModuleNotFoundError:
    from settings import settings  # type: ignore


class LocalFS:
    def __init__(self) -> None:
        self.base = Path.cwd()
        self.uploads_base = Path(settings.upload_dir)
        self.results_base = Path(settings.results_dir)
        self.uploads_base.mkdir(parents=True, exist_ok=True)
        self.results_base.mkdir(parents=True, exist_ok=True)

    # 업로드 저장
    def save_upload(self, file_id: str, filename: str, data: bytes) -> str:
        target_dir = self.uploads_base / file_id
        target_dir.mkdir(parents=True, exist_ok=True)
        p = target_dir / filename
        p.write_bytes(data)
        return p.as_posix()

    # 기존 경로에서 복사
    def copy_from_path(self, file_id: str, src_path: str) -> str:
        src = Path(src_path)
        if not src.exists():
            raise FileNotFoundError(src_path)
        target_dir = self.uploads_base / file_id
        target_dir.mkdir(parents=True, exist_ok=True)
        dst = target_dir / src.name
        shutil.copy2(src, dst)
        return dst.as_posix()

    # 결과 디렉토리 준비
    def ensure_result_dirs(self, file_id: str):
        (self.results_base / file_id).mkdir(parents=True, exist_ok=True)

    # 텍스트/JSON 쓰기
    def write_text(self, file_id: str, name: str, text: str) -> str:
        p = self.results_base / file_id / name
        p.write_text(text or "", encoding="utf-8")
        return p.as_posix()

    def write_json(self, file_id: str, name: str, obj) -> str:
        p = self.results_base / file_id / name
        p.write_text(json.dumps(obj or {}, ensure_ascii=False, indent=2), encoding="utf-8")
        return p.as_posix()

    # 병합 PDF 복사 (원본 파이프라인에서 만든 경로를 전달받는다고 가정)
    def copy_merged_pdf(self, file_id: str, merged_pdf_path: str | None) -> str | None:
        if not merged_pdf_path:
            return None
        src = Path(merged_pdf_path)
        if not src.exists():
            return None
        dst = self.results_base / file_id / "merged.pdf"
        shutil.copy2(src, dst)
        return dst.as_posix()

    # 다운로드 경로
    def get_result_file(self, file_id: str, kind: str) -> Path:
        if kind == "text":
            return self.results_base / file_id / "ocr.txt"
        if kind == "json":
            return self.results_base / file_id / "ocr.json"
        if kind == "pdf":
            return self.results_base / file_id / "merged.pdf"
        return self.results_base / file_id / kind  # fallback
