# services/ocr.py
import os
import io
import zipfile
import shutil
from typing import List, Dict, Tuple

import fitz  # PyMuPDF
from PIL import Image, ImageOps
import pytesseract

# ------------------------------------------------------------
# Tesseract 실행 파일 경로 설정 (환경변수 > 시스템 PATH > 기본 설치경로)
# ------------------------------------------------------------
pytesseract.pytesseract.tesseract_cmd = (
    os.getenv("TESSERACT_CMD")
    or shutil.which("tesseract")
    or r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

# ------------------------------------------------------------
# 내부 유틸
# ------------------------------------------------------------
def _best_lang() -> str:
    """kor.traineddata 존재 시 kor+eng, 아니면 eng"""
    # 1) 윈도우 기본 경로
    win_kor = r"C:\Program Files\Tesseract-OCR\tessdata\kor.traineddata"
    # 2) TESSDATA_PREFIX 환경변수 기반
    tdp = os.getenv("TESSDATA_PREFIX", "").rstrip("\\/") if os.getenv("TESSDATA_PREFIX") else ""
    env_kor = os.path.join(tdp, "kor.traineddata") if tdp else ""
    has_kor = os.path.exists(win_kor) or (env_kor and os.path.exists(env_kor))
    return "kor+eng" if has_kor else "eng"


def _tess_config(mode: str) -> str:
    """
    fast   : 가벼운 엔진/설정
    quality: 정확도 우선
    """
    return "--oem 1 --psm 6" if mode == "fast" else "--oem 3 --psm 6"


def _render_page(page: "fitz.Page", scale: float) -> Image.Image:
    """PDF 페이지를 이미지로 렌더 (scale=2.0 ≈144dpi, 4.0 ≈288dpi)"""
    m = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=m, alpha=False)  # alpha는 OCR에 불필요
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")


# ------------------------------------------------------------
# 공개 API: OCR 본 함수
# ------------------------------------------------------------
def ocr_funnel_extract(
    content: bytes,
    filename: str = "file",
    mode: str = "quality",
) -> Tuple[str, int, Dict, List[Dict]]:
    """
    텍스트 레이어가 있으면 그대로 사용, 없으면 렌더+Tesseract.
    반환:
      - full_text: str            (페이지 텍스트 합친 원본문)
      - pages: int
      - meta: dict                {"mode": ..., "text_layer_pages": int, "coverage": float}
      - per_page: list[dict]      [{"index": i, "has_text": bool, "text": str}]
    """
    lang = _best_lang()
    cfg = _tess_config(mode)
    scale = 2.0 if mode == "fast" else 4.0  # fast는 2x, quality는 4x 렌더

    per_page: List[Dict] = []
    full_texts: List[str] = []
    pages = 0

    # PDF
    if filename.lower().endswith(".pdf"):
        # 안전 종료를 위해 컨텍스트 사용
        with fitz.open(stream=content, filetype="pdf") as doc:
            for page in doc:
                pages += 1
                # 1) 텍스트 레이어 우선
                t = (page.get_text("text") or "").strip()
                has_text_layer = len(t) >= 50  # 너무 짧으면 신뢰도 낮다고 판단

                if not has_text_layer:
                    # 2) 렌더 + 전처리 + Tesseract
                    img = _render_page(page, scale=scale)
                    g = ImageOps.grayscale(img)
                    g = ImageOps.autocontrast(g, cutoff=1)
                    t = pytesseract.image_to_string(g, lang=lang, config=cfg)

                per_page.append({"index": pages - 1, "has_text": has_text_layer, "text": t})
                full_texts.append(t)

    # 단일 이미지
    else:
        pages = 1
        img = Image.open(io.BytesIO(content)).convert("RGB")
        g = ImageOps.grayscale(img)
        g = ImageOps.autocontrast(g, cutoff=1)
        t = pytesseract.image_to_string(g, lang=lang, config=cfg)
        per_page.append({"index": 0, "has_text": False, "text": t})
        full_texts.append(t)

    used_text = sum(1 for p in per_page if (p["text"] or "").strip())
    meta = {
        "mode": mode,
        "text_layer_pages": sum(1 for p in per_page if p["has_text"]),
        "coverage": used_text / max(1, pages),
    }

    return "\n".join(full_texts), pages, meta, per_page


# ------------------------------------------------------------
# 공개 API: ZIP 일괄 OCR
#   - 메인 코드 호환을 위해 (name, text, pages)만 yield
#   - meta/per_page는 내부에서 무시
# ------------------------------------------------------------
def batch_ocr_zip(zip_bytes: bytes):
    with zipfile.ZipFile(io.BytesIO(zip_bytes), 'r') as z:
        for name in z.namelist():
            if name.endswith('/'):
                continue  # 디렉토리는 스킵
            # 잡파일/숨김파일 스킵
            lname = name.lower()
            if os.path.basename(lname) in (".ds_store", "thumbs.db"):
                continue
            data = z.read(name)
            text, pages, *_ = ocr_funnel_extract(data, filename=name, mode="quality")
            yield name, text, pages
