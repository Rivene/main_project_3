import os
import re
import argparse
import json
import datetime
import uuid
from pathlib import Path

import fitz  # PyMuPDF
import cv2
import numpy as np
import pytesseract
from PIL import Image
import sys

# 콘솔 한글 깨짐 방지
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# ====== (필요 시 경로 지정) ======
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
os.environ["TESSDATA_PREFIX"] = r"C:\Program Files\Tesseract-OCR\tessdata"


def render_pdf_to_images(pdf_path: Path, dpi: int, out_dir: Path, max_pages: int = None):
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    n_pages = len(doc) if not max_pages else min(len(doc), max_pages)
    imgs = []
    for i in range(n_pages):
        page = doc[i]
        pix = page.get_pixmap(matrix=mat, alpha=False)
        p = out_dir / f"page_{i+1:03d}.png"
        pix.save(p.as_posix())
        imgs.append(p)
    return imgs

# ---------- 전처리 ----------
def _clahe(gray):
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    return clahe.apply(gray)

def deskew(gray):
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, minLineLength=100, maxLineGap=10)
    if lines is None:
        return gray
    angles = []
    for x1,y1,x2,y2 in lines[:,0]:
        angle = np.degrees(np.arctan2(y2-y1, x2-x1))
        if -45 < angle < 45:
            angles.append(angle)
    if not angles:
        return gray
    med = float(np.median(angles))
    h, w = gray.shape
    M = cv2.getRotationMatrix2D((w//2, h//2), med, 1.0)
    return cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

def remove_table_lines(gray):
    if len(gray.shape) == 3:
        gray = cv2.cvtColor(gray, cv2.COLOR_BGR2GRAY)
    bw_inv = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40,1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1,40))
    h_lines = cv2.morphologyEx(bw_inv, cv2.MORPH_OPEN, h_kernel, iterations=1)
    v_lines = cv2.morphologyEx(bw_inv, cv2.MORPH_OPEN, v_kernel, iterations=1)
    lines = cv2.bitwise_or(h_lines, v_lines)
    no_lines = cv2.bitwise_and(bw_inv, cv2.bitwise_not(lines))
    return cv2.bitwise_not(no_lines)

def preprocess(img_bgr, mode="adaptive", do_deskew=False, table_clean=False):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    if do_deskew:
        gray = deskew(gray)

    if mode == "none":
        proc = gray
    elif mode == "adaptive":
        g = cv2.GaussianBlur(gray, (3,3), 0)
        proc = cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                     cv2.THRESH_BINARY, 31, 5)
    elif mode == "otsu":
        g = cv2.GaussianBlur(gray, (5,5), 0)
        _, proc = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    elif mode == "clahe_adaptive":
        g = _clahe(gray)
        g = cv2.GaussianBlur(g, (3,3), 0)
        proc = cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                     cv2.THRESH_BINARY, 31, 3)
    elif mode == "morph_open_adaptive":
        g = cv2.GaussianBlur(gray, (3,3), 0)
        bw = cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                   cv2.THRESH_BINARY, 31, 10)
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (2,2))
        proc = cv2.morphologyEx(bw, cv2.MORPH_OPEN, k, iterations=1)
    elif mode == "morph_close_otsu":
        g = cv2.GaussianBlur(gray, (3,3), 0)
        _, bw = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (2,2))
        proc = cv2.morphologyEx(bw, cv2.MORPH_CLOSE, k, iterations=1)
    else:
        proc = gray

    if table_clean:
        proc = remove_table_lines(proc)

    return proc

# ---------- OCR ----------
def ocr_with_boxes(img_np, langs="kor+chi_tra+eng", psm=6, whitelist=None, blacklist=None, oem=None):
    cfg = f"--psm {psm}"
    if oem is not None:
        cfg += f" --oem {oem}"
    if whitelist:
        cfg += f" -c tessedit_char_whitelist={whitelist}"
    if blacklist:
        cfg += f" -c tessedit_char_blacklist={blacklist}"
    cfg += " -c preserve_interword_spaces=1"

    data = pytesseract.image_to_data(
        img_np, lang=langs, config=cfg, output_type=pytesseract.Output.DICT
    )

    # CJK는 보통 띄어쓰기 품질이 낮으므로 라인 내에서는 붙여서 처리
    langs_lower = (langs or "").lower()
    is_cjk = any(k in langs_lower for k in ["kor", "chi", "jpn"])

    from collections import defaultdict
    groups = defaultdict(list)  # key -> [(x, text)]
    order_keys = []             # 원래 라인 순서 유지

    n = len(data.get("text", []))
    for i in range(n):
        t = (data["text"][i] or "").strip()
        if not t:
            continue
        key = (data.get("block_num",[0])[i], data.get("par_num",[0])[i], data.get("line_num",[0])[i])
        if key not in groups:
            order_keys.append(key)
        x = int(data.get("left",[0])[i] or 0)
        groups[key].append((x, t))

    line_texts = []
    for key in order_keys:
        line = sorted(groups[key], key=lambda x: x[0])  # x좌표 정렬
        tokens = [t for _, t in line]
        line_texts.append("".join(tokens) if is_cjk else " ".join(tokens))

    full_text = "\n".join(line_texts)
    return data, full_text

# ---------- 헤더 보정 ----------
def header_fix_text(bgr, base_text, header_ratio=0.12):
    H, W = bgr.shape[:2]
    h_cut = max(10, int(H * header_ratio))
    roi = bgr[0:h_cut, :]

    _, head_text = ocr_with_boxes(
        preprocess(roi, mode="otsu", do_deskew=False, table_clean=False),
        langs="kor+chi_tra", psm=7, whitelist=None, blacklist="0123456789", oem=1
    )

    base_lines = [ln for ln in (base_text or "").splitlines() if ln.strip() != ""]
    if not base_lines:
        return head_text

    if re.match(r"^\s*\[\s*\d{1,2}\s*\]\.?", base_lines[0]) or len(base_lines[0]) <= 4:
        base_lines[0] = head_text.strip()
        return "\n".join(base_lines)
    return (head_text.strip() + "\n" + "\n".join(base_lines)).strip()

# ---------- json 결과 보정 ----------
def data_to_line_json(data, langs="kor+eng"):
    """pytesseract Output.DICT → 사람이 보기 좋은 라인 기반 JSON"""
    from collections import defaultdict

    langs_lower = (langs or "").lower()
    is_cjk = any(k in langs_lower for k in ["kor", "chi", "jpn"])

    groups = defaultdict(list)
    order_keys = []

    n = len(data.get("text", []))
    for i in range(n):
        t = (data["text"][i] or "").strip()
        if not t:
            continue
        key = (data.get("block_num",[0])[i],
               data.get("par_num",[0])[i],
               data.get("line_num",[0])[i])
        if key not in groups:
            order_keys.append(key)
        token = {
            "text": t,
            "conf": float(data["conf"][i]) if data["conf"][i] != "-1" else None,
            "box": [ int(data["left"][i]),
                     int(data["top"][i]),
                     int(data["width"][i]),
                     int(data["height"][i]) ]
        }
        groups[key].append(token)

    lines = []
    for key in order_keys:
        tokens = sorted(groups[key], key=lambda x: x["box"][0])  # x 좌표순
        text_line = "".join(tok["text"] for tok in tokens) if is_cjk else " ".join(tok["text"] for tok in tokens)
        lines.append({"line_text": text_line, "tokens": tokens})

    return {"num_lines": len(lines), "lines": lines}

# ---------- 시각화 ----------
def draw_vis(base_img_bgr, data, min_conf=50, scale=1.0):
    vis = base_img_bgr.copy()
    thickness = max(1, int(2*scale))
    fscale = max(0.4, 0.7*scale)
    n = len(data["text"])
    for i in range(n):
        conf_str = data["conf"][i]
        try:
            conf = int(float(conf_str))
        except Exception:
            conf = -1
        if conf < min_conf:
            continue
        x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        txt = (data["text"][i] or "").strip()
        if not txt:
            continue
        cv2.rectangle(vis, (x, y), (x+w, y+h), (0, 200, 0), thickness)
        label = txt[:30]
        ty = max(0, y-5)
        cv2.putText(vis, label, (x, ty), cv2.FONT_HERSHEY_SIMPLEX, fscale, (0,0,0), thickness+2, cv2.LINE_AA)
        cv2.putText(vis, label, (x, ty), cv2.FONT_HERSHEY_SIMPLEX, fscale, (255,255,255), thickness, cv2.LINE_AA)
    return vis

def make_out_dir(base_root: Path, custom_name: str | None, tag: str | None):
    if custom_name:  # --out이 오면 그대로 사용, 이미 존재하면 uuid 덧붙임
        dname = custom_name
        out_dir = base_root / dname
        if out_dir.exists():
            dname = f"{dname}_{uuid.uuid4().hex[:8]}"
            out_dir = base_root / dname
    else:
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        dname = f"out_tesseract_{ts}"
        if tag:
            dname += f"_{tag}"
        out_dir = base_root / dname

    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[INFO] OUTDIR  : {out_dir}", flush=True)
    print(f"__OUTDIR__={out_dir}", flush=True)  # 외부 파이프라인 파싱용
    return out_dir

# ---------- main ----------
def main():
    script_dir = Path(__file__).resolve().parent

    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=str, help="입력 PDF 경로")
    ap.add_argument("--langs", type=str, default="kor+chi_tra+eng")
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--psm", type=int, default=6)
    ap.add_argument("--oem", type=int, default=None, help="Tesseract OEM (0=Legacy, 1=LSTM, 3=Default)")
    ap.add_argument("--max_pages", type=int, default=0)
    ap.add_argument("--out_root", type=str, default=str(script_dir))
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--name", type=str, default="")
    ap.add_argument("--min_conf", type=int, default=50)
    ap.add_argument("--vis_scale", type=float, default=1.0)
    ap.add_argument("--prep", type=str, default="adaptive",
                    choices=["none","adaptive","otsu","clahe_adaptive","morph_open_adaptive","morph_close_otsu"])
    ap.add_argument("--deskew", action="store_true")
    ap.add_argument("--table_clean", action="store_true")
    ap.add_argument("--whitelist", type=str, default="")
    ap.add_argument("--blacklist", type=str, default="")
    ap.add_argument("--header_fix", action="store_true", help="상단 헤더 영역 재OCR 후 교체")
    args = ap.parse_args()

    pdf_path = Path(args.pdf)
    out_root = Path(args.out_root)
    out_dir = make_out_dir(out_root, args.out if args.out.strip() else None,
                           args.name if args.name.strip() else None)

    page_dir = out_dir / "pages"
    txt_dir  = out_dir / "ocr_txt"
    vis_dir  = out_dir / "vis"
    json_dir = out_dir / "json"
    for d in (page_dir, txt_dir, vis_dir, json_dir):
        d.mkdir(parents=True, exist_ok=True)

    print(f"[INFO] PDF     : {pdf_path}")
    print(f"[INFO] OUTDIR  : {out_dir}")
    print(f"[INFO] LANGS   : {args.langs}, PSM={args.psm}, OEM={args.oem}")
    print(f"[INFO] PREP    : {args.prep}, DESKEW={args.deskew}, TABLE_CLEAN={args.table_clean}")
    if args.whitelist: print(f"[INFO] WHITELIST: {args.whitelist}")
    if args.blacklist: print(f"[INFO] BLACKLIST: {args.blacklist}")
    if args.header_fix: print(f"[INFO] HEADER_FIX=ON")

    images = render_pdf_to_images(pdf_path, args.dpi, page_dir,
                                  None if args.max_pages in (0, None) else args.max_pages)

    for i, img_path in enumerate(images, start=1):
        try:
            bgr = cv2.imread(img_path.as_posix(), cv2.IMREAD_COLOR)
            if bgr is None:
                print(f"[WARN] 이미지 로드 실패: {img_path}", flush=True)
                continue

            pre = preprocess(bgr, mode=args.prep, do_deskew=args.deskew, table_clean=args.table_clean)
            data, text = ocr_with_boxes(
                pre, langs=args.langs, psm=args.psm,
                whitelist=args.whitelist if args.whitelist.strip() else None,
                blacklist=args.blacklist if args.blacklist.strip() else None,
                oem=args.oem
            )

            if args.header_fix:
                text = header_fix_text(bgr, text)

            (txt_dir / f"page_{i:03d}.txt").write_text(text, encoding="utf-8", errors="ignore")
            (json_dir / f"page_{i:03d}.json").write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )

            vis = draw_vis(bgr, data, min_conf=args.min_conf, scale=args.vis_scale)
            cv2.imwrite((vis_dir / f"page_{i:03d}.png").as_posix(), vis)

        except Exception as e:
            print(f"[WARN] 페이지 {i:03d} 처리 실패: {e}", flush=True)
            # 실패 페이지에도 최소 산출 남기기
            try:
                (txt_dir / f"page_{i:03d}.txt").write_text("", encoding="utf-8")
                (json_dir / f"page_{i:03d}.json").write_text(
                    json.dumps({"error": str(e)}, ensure_ascii=False, indent=2), encoding="utf-8"
                )
            except Exception:
                pass
            continue

if __name__ == "__main__":
    main()