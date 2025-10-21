import subprocess
import sys
import json
import uuid
import re
import shutil
from pathlib import Path
from typing import Dict, Any

# Tesseract 경로
HERE = Path(__file__).parent
SCRIPT = HERE / "ocr_pdf_tesseract_vis_eval.py"

# 파이프라인 스크립트가 표준출력으로 남기는 아웃풋 디렉토리 표시 라인
OUTDIR_RE = re.compile(r"__OUTDIR__=(.+)$")


def run_tesseract_pipeline(
    pdf: str,
    out_root: str,
    dpi: int,
    prep: str,
    langs: str,
    psm: int,
    keep_extra: bool = False,  # 최소 산출 모드 (False면 정리)
) -> Dict[str, Any]:
    orig_pdf: Path = Path(pdf).resolve()
    out_root_path: Path = Path(out_root).resolve()
    out_root_path.mkdir(parents=True, exist_ok=True)

    out_name = f"out_tesseract_{orig_pdf.stem}_{uuid.uuid4().hex[:8]}"

    cmd = [
        sys.executable, str(SCRIPT),
        str(orig_pdf),
        "--dpi", str(dpi),
        "--prep", prep,
        "--langs", langs,
        "--psm", str(psm),
        "--out_root", str(out_root_path),
        "--out", out_name,
    ]

    proc = subprocess.run(cmd, text=True, capture_output=True)
    stdout = proc.stdout or ""
    stderr = proc.stderr or ""
    all_lines = (stdout + ("\n" + stderr if stderr else "")).splitlines()

    outdir = None
    for line in all_lines:
        m = OUTDIR_RE.search(line)
        if m:
            outdir = Path(m.group(1)).resolve()
            break

    if proc.returncode != 0:
        tail = "\n".join(all_lines[-50:])
        raise RuntimeError(f"OCR 파이프라인 실패 (exit={proc.returncode})\n---- tail ----\n{tail}")

    base = outdir if (outdir and outdir.is_dir()) else (out_root_path / out_name)

    pages = base / "pages"
    txt   = base / "ocr_txt"
    vis   = base / "vis"
    jdir  = base / "json"

    merged_txt  = txt / "merged.txt"
    merged_json = jdir / "merged.json"
    merged_pdf  = base / "merged.pdf"
    meta_path   = base / "meta.json"

    # meta.json
    try:
        meta_path.write_text(
            json.dumps({"sourcePdf": str(orig_pdf)}, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    except Exception as e:
        print("[WARN] meta.json 저장 실패:", e)

    # TXT 병합
    try:
        txt_files = sorted(txt.glob("*.txt"))
        merged_txt.write_text(
            "\n\n".join(f.read_text(encoding="utf-8") for f in txt_files),
            encoding="utf-8"
        )
    except Exception as e:
        print("[WARN] TXT 병합 실패:", e)

    # JSON 병합
    try:
        all_json = []
        for f in sorted(jdir.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except Exception:
                continue
            if isinstance(data, list):
                all_json.extend(data)
            else:
                all_json.append(data)
        merged_json.write_text(
            json.dumps(all_json, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    except Exception as e:
        print("[WARN] JSON 병합 실패:", e)

    # PDF 병합(있으면)
    try:
        from PyPDF2 import PdfMerger  # optional
        pdf_dir = base / "pages_pdf"
        pdf_files = sorted(pdf_dir.glob("*.pdf"))
        if pdf_files:
            merger = PdfMerger()
            for f in pdf_files:
                merger.append(str(f))
            merger.write(merged_pdf)
            merger.close()
        else:
            shutil.copyfile(orig_pdf, merged_pdf)
    except Exception as e:
        print("[WARN] PDF 병합 실패:", e)
        try:
            shutil.copyfile(orig_pdf, merged_pdf)
        except Exception as ce:
            print("[WARN] PDF 폴백 복사 실패:", ce)

    # 최소 산출 모드: 불필요 디렉토리/파일 정리
    if not keep_extra:
        try:
            for d in (base / "pages_pdf", pages, vis):
                if d.exists():
                    shutil.rmtree(d, ignore_errors=True)
        except Exception as e:
            print("[WARN] 산출물 정리 실패:", e)

    return {
        "outDir": str(base),
        "pagesDir": str(pages), 
        "txtDir": str(txt),
        "visDir": str(vis),
        "jsonDir": str(jdir),
        "mergedTxt": str(merged_txt),
        "mergedJson": str(merged_json),
        "mergedPdf": str(merged_pdf),
        "id": base.name,
    }