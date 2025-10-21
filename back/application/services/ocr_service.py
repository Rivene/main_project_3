from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
from pathlib import Path
import json

from back.settings import settings
from back.infrastructure.db.oracle_repo import OracleRepo
# 원본 파이프라인 직접 호출 (변경 없음)
from back.ocr.tesseract_runner import run_tesseract_pipeline
from back.llm.ollama_client import summarize as summarize_text


@dataclass
class OcrResultPaths:
    text_path: str
    json_path: str
    merged_pdf_path: str
    llm_json_path: Optional[str] = None


def process_ocr(
    *,
    file_path: str,
    file_id: str,
    filename: str,
    dpi: int,
    prep: str,
    langs: str,
    psm: int,
    do_summary: bool,
    llm_model: str,
    category_id: Optional[int],
    category_name: Optional[str],
    fs,
):
    """
    원본 로직 유지:
    - run_tesseract_pipeline(file_path, dpi, prep, langs, psm) 호출
    - (옵션) summarize_text() 실행
    - 파일 저장은 LocalFS 활용
    - OracleRepo.save_document() 호출 (원본 메서드 시그니처 그대로)
    """
    # OCR
    # 주의: 원본 함수 시그니처를 그대로 따름
    # Match tesseract_runner signature: (pdf, out_root, dpi, prep, langs, psm, keep_extra=False)
    try:
        out_root = str(getattr(fs, "results_base", None) or settings.results_dir)
    except Exception:
        out_root = settings.RESULTS_DIR if hasattr(settings, "RESULTS_DIR") else "./results"
    ocr_out = run_tesseract_pipeline(
        pdf=file_path,
        out_root=out_root,
        dpi=dpi,
        prep=prep,
        langs=langs,
        psm=psm,
    )
    # ocr_out은 원본 함수 반환 형식에 맞춰 사용 (텍스트/JSON/병합PDF 등)

    # 저장 경로 준비
    fs.ensure_result_dirs(file_id)
    # Read files produced by runner
    merged_txt_file = ocr_out.get("mergedTxt")
    merged_json_file = ocr_out.get("mergedJson")
    merged_pdf_file = ocr_out.get("mergedPdf")

    try:
        text_data = Path(merged_txt_file).read_text(encoding="utf-8") if merged_txt_file and Path(merged_txt_file).exists() else ""
    except Exception:
        text_data = ""
    try:
        json_text = Path(merged_json_file).read_text(encoding="utf-8") if merged_json_file and Path(merged_json_file).exists() else None
        json_data = json.loads(json_text) if json_text else {}
    except Exception:
        json_data = {}

    # Fallback: derive text from JSON when mergedTxt is empty
    if (not text_data) and json_data:
        try:
            if isinstance(json_data, list):
                parts = []
                for item in json_data:
                    if isinstance(item, dict):
                        t = item.get("text") or item.get("ocr_text") or ""
                        if t:
                            parts.append(t)
                text_joined = "\n\n".join(parts).strip()
                if text_joined:
                    text_data = text_joined
        except Exception:
            pass

    fs.ensure_result_dirs(file_id)
    text_path = fs.write_text(file_id, "ocr.txt", text_data)
    json_path = fs.write_json(file_id, "ocr.json", json_data)
    merged_pdf_path = fs.copy_merged_pdf(file_id, merged_pdf_file)

    llm_summary_text = None
    llm_json_path = None

    if do_summary:
        llm_summary_text = summarize_text(
            text_data,
            model=llm_model or settings.OLLAMA_MODEL,
        )
        llm_json_path = fs.write_json(
            file_id, "llm.json", {"model": llm_model, "summary": llm_summary_text}
        )

    # DB 저장 (원본 OracleRepo 호출 시그니처 그대로)
    try:
        repo = OracleRepo()
        repo.save_document(
            server_file_id=file_id,
            filename=filename,
            title=filename,
            size_bytes=len((text_data or "").encode("utf-8")),
            summary_text=llm_summary_text,
        )
    except Exception:
        # DB 연결 안 되어도 전체 파이프라인 실패시키지 않음 (원본 관성 유지)
        pass

    return {
        "file_id": file_id,
        "filename": filename,
        "dpi": dpi,
        "prep": prep,
        "langs": langs,
        "psm": psm,
        "ocr": {
            "text_rel": f"{file_id}/ocr.txt",
            "json_rel": f"{file_id}/ocr.json",
            "merged_pdf_rel": f"{file_id}/merged.pdf" if merged_pdf_path else None,
        },
        "llm": {
            "model": llm_model,
            "summary_text": llm_summary_text,
            "json_rel": f"{file_id}/llm.json" if llm_json_path else None,
        },
        "category": {
            "id": category_id,
            "name": category_name,
        },
    }
