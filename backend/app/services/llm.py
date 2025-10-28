# services/llm.py
# -------------------------------------------------------------
# 고품질 요약 파이프라인
# - 사전 정규화(헤더/페이지번호/잡음 제거)
# - 맵-리듀스(분할 요약 → 통합 요약)
# - 반(反)복붙 규칙(8단어 연속 금지) + 후처리 검출
# - 한국어 정책/법안 문서 분류 가이드 + 예시 강화
# - Ollama /api/chat 사용 + 빈응답 시 /api/generate 재시도
# -------------------------------------------------------------

import os
import re
import json
import time
import logging
from typing import Any, Dict, List, Tuple

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger("app")

# ===== 환경 변수 =====
OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_TIMEOUT: int = int(os.getenv("OLLAMA_TIMEOUT", "300"))

def _parse_ollama_options() -> Dict[str, Any]:
    """
    OLLAMA_OPTIONS="temperature=0.25,num_predict=512,top_p=0.9"
    미설정 시 복붙 억제와 과다출력 방지에 유리한 기본값 사용.
    """
    raw = os.getenv("OLLAMA_OPTIONS", "").strip()
    base = {"temperature": 0.25, "top_p": 0.9, "num_predict": 512}
    if not raw:
        return base
    opts: Dict[str, Any] = {}
    for token in raw.split(","):
        token = token.strip()
        if not token or "=" not in token:
            continue
        k, v = token.split("=", 1)
        k, v = k.strip(), v.strip()
        if v.isdigit():
            opts[k] = int(v)
        elif v.lower() in ("true", "false"):
            opts[k] = (v.lower() == "true")
        else:
            try:
                opts[k] = float(v)
            except ValueError:
                opts[k] = v
    base.update(opts)
    return base

OLLAMA_OPTIONS: Dict[str, Any] = _parse_ollama_options()

# ===== HTTP 세션 (속도/안정성) =====
_SESSION = requests.Session()
_ADAPTER = HTTPAdapter(
    pool_connections=16,
    pool_maxsize=16,
    max_retries=Retry(
        total=2,
        backoff_factor=0.2,
        status_forcelist=[502, 503, 504],
        raise_on_status=False,
    ),
)
_SESSION.mount("http://", _ADAPTER)
_SESSION.mount("https://", _ADAPTER)

# ===== 사전 정규화(핵심) =====
_ZWS = "\u200b\u200c\u200d\uFEFF"

HEADER_PATTERNS = [
    r"^\s*-\s*\d+\s*-\s*$",                    # "- 1 -" 형태 페이지 마커
    r"^\s*Page\s+\d+\s*(of\s+\d+)?\s*$",      # Page 1 (of 6)
    r"^\s*\d+\s*/\s*\d+\s*$",                 # "1/6"
    r"^\s*목\s*차\s*$",                        # "목차" 단독행
]

# (패턴, 치환 문자열)
INLINE_NOISE = [
    (r"\s{2,}", " "),        # 여러 공백 -> 한 칸
    (r"[ \t]+(\n)", r"\1"),  # 줄 끝 공백 제거(캡처그룹 사용)
]

def _strip_headers_footers(text: str) -> str:
    lines = [ln for ln in (text or "").splitlines()]
    keep: List[str] = []
    for ln in lines:
        s = ln.strip()
        if not s:
            keep.append("")
            continue
        if any(re.match(p, s) for p in HEADER_PATTERNS):
            continue
        keep.append(ln)

    out = "\n".join(keep)
    out = re.sub(rf"[{_ZWS}]", "", out)               # zero-width 제거
    out = re.sub(r"([^\d])-(\s*\n)", r"\1\n", out)    # 줄끝 하이픈 줄바꿈 정리
    out = re.sub(r"(?m)^\s*\d+\.\s*", "", out)        # 줄 번호 "1. " 제거
    for pat, repl in INLINE_NOISE:
        out = re.sub(pat, repl, out)
    out = re.sub(r"[─━═\-_=]{5,}", "", out)           # 긴 구분선 제거
    return out.strip()

def _preclean(text: str) -> str:
    t = (text or "").replace("\r", "")
    before = len(t)
    t = _strip_headers_footers(t)
    t = re.sub(r"\n{3,}", "\n\n", t)  # 빈줄 과축소 방지
    after = len(t)
    logger.info(f"[LLM] preclean: len_before={before}, len_after={after}")
    return t

# ===== 프롬프트 =====
SYS_SUMMARY = (
    "You are an expert summarizer for Korean government and legislative documents. "
    "Return Korean if the source is Korean. Produce short, abstract summaries that do not copy long spans of the source. "
    "Do NOT copy any sentence verbatim; limit any direct quote to <= 8 consecutive words. "
    "Be precise about policy changes, legal clauses, thresholds, dates."
)

CATEGORY_GUIDE = """
분류 가이드(예시):
- 정책/법안 / 국회보고
- 정책/법안 / 체계자구검토
- 산업/수산 / 조합·협동조합
- 조직/인사 / 여성참여·할당
- 재정/지원 / 보조·지원제도
문서에 맞춰 [대분류]/[소분류]를 한국어로 간결히 선택하세요.
"""

CHUNK_USER_PROMPT = (
    "아래 텍스트를 3~6개의 핵심 불릿으로 **간결한 추상화 요약**해줘.\n"
    "- 원문 문장 그대로 복사 금지(8단어 연속 금지)\n"
    "- 정책/조문/수치/대상/효과 중심으로 요약\n"
    "- 불릿 1개는 120자 이내\n"
    "- JSON만 반환\n\n"
    "{{\n"
    '  "bullets": ["...", "...", "..."]\n'
    "}}\n\n"
    "텍스트:\n"
    "{body}\n"
)


REDUCE_USER_PROMPT = (
    "여러 조각 요약을 통합해 **문서 전체 요약**을 작성하세요.\n"
    "- 제목 1줄(80자 이내)\n"
    "- bullets 4~8개, 각 120자 이내, 중복·군더더기 제거, 추상화 요약\n"
    "- category/subcategory는 한국어로, 아래 가이드를 참고해 선택\n"
    f"{CATEGORY_GUIDE}\n"
    "- 원문 문장 복사 금지(8단어 연속 금지)\n"
    "- JSON만 반환\n\n"
    "{\n"
    '  "title": "...",\n'
    '  "bullets": ["...", "..."],\n'
    '  "category": "정책/법안",\n'
    '  "subcategory": "국회보고"\n'
    "}\n\n"
    "조각 요약들(JSON 배열):\n"
    "{chunks}\n"
)

# ===== 공통 유틸: Ollama 호출 =====
def _ollama_chat(messages: List[Dict[str, str]]) -> str:
    url = f"{OLLAMA_HOST}/api/chat"
    payload: Dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": OLLAMA_OPTIONS,
    }
    t0 = time.perf_counter()
    try:
        logger.info(f"🧠 LLM call START (chat) model={OLLAMA_MODEL}")
        resp = _SESSION.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        content = (data.get("message") or {}).get("content", "") or ""
        dt = int((time.perf_counter() - t0) * 1000)
        logger.info(f"🧠 LLM call DONE (chat) in {dt} ms; len={len(content)}")
        return content
    except Exception as e:
        dt = int((time.perf_counter() - t0) * 1000)
        logger.exception(f"🧠 LLM call ERROR (chat) after {dt} ms: {e}")
        return ""

def _ollama_generate(prompt: str, system: str = "") -> str:
    url = f"{OLLAMA_HOST}/api/generate"
    full_prompt = (system + "\n\n" + prompt) if system else prompt
    payload: Dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "prompt": full_prompt,
        "stream": False,
        "options": OLLAMA_OPTIONS,
    }
    t0 = time.perf_counter()
    try:
        logger.info(f"🧠 LLM call START (generate) model={OLLAMA_MODEL}")
        resp = _SESSION.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        content = data.get("response", "") or ""
        dt = int((time.perf_counter() - t0) * 1000)
        logger.info(f"🧠 LLM call DONE (generate) in {dt} ms; len={len(content)}")
        return content
    except Exception as e:
        dt = int((time.perf_counter() - t0) * 1000)
        logger.exception(f"🧠 LLM call ERROR (generate) after {dt} ms: {e}")
        return ""

def _safe_json_parse(s: str) -> Dict[str, Any]:
    try:
        return json.loads(s)
    except Exception:
        pass
    m = re.search(r"\{[\s\S]*\}", s)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return {}
    return {}

def _clip_list_str(xs: List[str], n_max: int, each_len: int) -> List[str]:
    out: List[str] = []
    for x in xs[:n_max]:
        y = (x or "").strip()
        if not y:
            continue
        if len(y) > each_len:
            y = y[:each_len].rstrip() + "…"
        out.append(y)
    return out

def _contains_long_verbatim(bullet: str, source: str, limit_words: int = 8) -> bool:
    bw = re.findall(r"\w+", bullet)
    if len(bw) < limit_words:
        return False
    for i in range(0, len(bw) - limit_words + 1):
        phrase = " ".join(bw[i:i+limit_words])
        if phrase and phrase in source:
            return True
    return False

def _remove_overly_verbatim(bullets: List[str], source: str) -> List[str]:
    cleaned: List[str] = []
    for b in bullets:
        if not _contains_long_verbatim(b, source, limit_words=8):
            cleaned.append(b)
    return cleaned or bullets

def _split_text(text: str, max_chars: int = 1800) -> List[str]:
    s = (text or "").strip()
    if not s:
        return []
    if len(s) <= max_chars:
        return [s]
    parts, buf, acc = [], [], 0
    paras = re.split(r"\n{2,}", s)
    for p in paras:
        p = p.strip()
        if not p:
            continue
        if len(p) > max_chars:
            sents = re.split(r"(?<=[\.!?])\s+|(?<=[다요]\.)\s+", p)
            for sent in sents:
                sent = sent.strip()
                if not sent:
                    continue
                if acc + len(sent) + 1 > max_chars and buf:
                    parts.append("\n".join(buf)); buf, acc = [], 0
                buf.append(sent); acc += len(sent) + 1
        else:
            if acc + len(p) + 2 > max_chars and buf:
                parts.append("\n".join(buf)); buf, acc = [], 0
            buf.append(p); acc += len(p) + 2
    if buf:
        parts.append("\n".join(buf))
    return parts or [s[:max_chars]]

# ===== 규칙 기반 카테고리 보정 =====
def _rule_category(text: str) -> Tuple[str, str]:
    t = (text or "").replace(" ", "")
    if "체계자구검토" in t:
        return ("정책/법안", "체계자구검토")
    if "위원회의결안" in t:
        return ("정책/법안", "국회보고")
    if "검토보고서" in t:
        return ("정책/법안", "검토보고")
    if "수산업협동조합법" in t:
        return ("정책/법안", "조합·협동조합")
    if "여성임원" in t or "여성참여" in t:
        return ("조직/인사", "여성참여·할당")
    return ("미분류", "미분류")

# ===== 요약 파이프라인 =====
def _summarize_chunk(chunk: str) -> List[str]:
    messages = [
        {"role": "system", "content": SYS_SUMMARY},
        {"role": "user", "content": CHUNK_USER_PROMPT.format(body=chunk)},
    ]
    content = _ollama_chat(messages)
    if not content or len(content) < 5:
        logger.warning("[LLM] empty/short chat result; retrying with /api/generate")
        content = _ollama_generate(CHUNK_USER_PROMPT.format(body=chunk), system=SYS_SUMMARY)

    obj = _safe_json_parse(content)
    bullets = obj.get("bullets", [])
    if not isinstance(bullets, list):
        bullets = [str(bullets)]
    bullets = [str(b).strip() for b in bullets if str(b).strip()]
    bullets = _clip_list_str(bullets, n_max=8, each_len=140)
    bullets = _remove_overly_verbatim(bullets, chunk)
    return bullets

def _reduce_summaries(all_bullets: List[List[str]]) -> Dict[str, Any]:
    chunk_objs = [{"bullets": blts} for blts in all_bullets if blts]
    reduce_prompt = REDUCE_USER_PROMPT.format(chunks=json.dumps(chunk_objs, ensure_ascii=False))

    messages = [
        {"role": "system", "content": SYS_SUMMARY},
        {"role": "user", "content": reduce_prompt},
    ]
    content = _ollama_chat(messages)
    if not content or len(content) < 5:
        logger.warning("[LLM] empty/short chat result in reduce; retrying with /api/generate")
        content = _ollama_generate(reduce_prompt, system=SYS_SUMMARY)

    obj = _safe_json_parse(content)

    title = str(obj.get("title", "")).strip()[:120] or "Untitled"
    bullets = obj.get("bullets", [])
    if not isinstance(bullets, list):
        bullets = [str(bullets)]
    bullets = [str(b).strip() for b in bullets if str(b).strip()]
    bullets = _clip_list_str(bullets, n_max=8, each_len=140)

    cat = str(obj.get("category", "")).strip()
    sub = str(obj.get("subcategory", "")).strip()
    return {
        "title": title,
        "bullets": bullets,
        "category": cat or "미분류",
        "subcategory": sub or "미분류",
    }

def _fallback_summary(text: str) -> Dict[str, Any]:
    head = (text or "").strip().splitlines()
    title = (head[0] if head else "Untitled").strip()[:120]
    body = " ".join(head[1:])[:600]
    bullets = [body[i:i+100] for i in range(0, len(body), 100)][:5] or [title]
    return {
        "title": title or "Untitled",
        "bullets": bullets,
        "category": "미분류",
        "subcategory": "미분류",
    }

def summarize_and_categorize(text: str) -> Dict[str, Any]:
    try:
        # ─────────────────────────────────────────
        # 로컬 규칙 분류기(없으면 여기 걸로 보정)
        # ─────────────────────────────────────────
        def _rule_category_local(src: str) -> Tuple[str, str]:
            t = (src or "").replace(" ", "")
            if "체계자구검토" in t:
                return ("정책/법안", "체계자구검토")
            if "위원회의결안" in t or "의결안" in t:
                return ("정책/법안", "국회보고")
            if "검토보고서" in t or "검토보고" in t:
                return ("정책/법안", "검토보고")
            if "수산업협동조합법" in t or "협동조합" in t:
                return ("정책/법안", "조합·협동조합")
            if "여성임원" in t or "여성참여" in t or "여성할당" in t:
                return ("조직/인사", "여성참여·할당")
            return ("미분류", "미분류")

        cleaned = _preclean(text)
        if not cleaned and text:
            cleaned = text  # 과잉 정규화 방지

        # === 빠른 경로: 짧은 문서는 원패스 요약으로 끝내기 ===
        QUICK_N = int(os.getenv("SUMM_QUICK_THRESHOLD", "2500"))
        if len(cleaned) <= QUICK_N:
            logger.info(f"[LLM] quick path: single-pass summarize (len={len(cleaned)})")
            # chat 시도
            content = _ollama_chat([
                {"role": "system", "content": SYS_SUMMARY},
                {"role": "user", "content": REDUCE_USER_PROMPT.format(
                    chunks=json.dumps([{"bullets": []}], ensure_ascii=False)
                ) + "\n\n원문 전체 텍스트:\n" + cleaned[:8000]}
            ])
            # 빈/짧으면 generate 재시도
            if not content or len(content) < 5:
                logger.warning("[LLM] quick path empty/short; retrying with /api/generate")
                prompt = REDUCE_USER_PROMPT.format(
                    chunks=json.dumps([{"bullets": []}], ensure_ascii=False)
                ) + "\n\n원문 전체 텍스트:\n" + cleaned[:8000]
                content = _ollama_generate(prompt, system=SYS_SUMMARY)

            obj = _safe_json_parse(content)
            title = (str(obj.get("title", "")) or "Untitled")[:120]
            bullets = obj.get("bullets", [])
            if not isinstance(bullets, list):
                bullets = [str(bullets)]
            bullets = _clip_list_str([str(b).strip() for b in bullets if str(b).strip()], n_max=8, each_len=140)
            cat = (str(obj.get("category", "")) or "").strip()
            sub = (str(obj.get("subcategory", "")) or "").strip()
            if not cat or not sub or cat == "미분류" or sub == "미분류":
                rc, rs = _rule_category_local(cleaned)
                cat, sub = rc, rs
            return {
                "title": title,
                "bullets": bullets,
                "category": cat or "미분류",
                "subcategory": sub or "미분류",
            }

        # === 기존(맵-리듀스) 경로 ===
        logger.info(f"[LLM] input lengths: raw={len(text or '')}, cleaned={len(cleaned)}")
        chunks = _split_text(cleaned, max_chars=1800)
        logger.info(f"[LLM] chunk_count={len(chunks)}, chunk_lens={[len(c) for c in chunks[:3]]}{'...' if len(chunks)>3 else ''}")

        if not chunks and cleaned:
            chunks = [cleaned[:1800]]
            logger.warning("[LLM] chunks empty after split; forcing single chunk to call Ollama.")

        if not chunks:
            logger.warning("[LLM] no content after cleaning; using fallback.")
            return _fallback_summary(cleaned)

        all_bullets: List[List[str]] = []
        for idx, ch in enumerate(chunks):
            logger.info(f"[LLM] summarize chunk {idx+1}/{len(chunks)} len={len(ch)}")
            blts = _summarize_chunk(ch)
            logger.info(f"[LLM] chunk {idx+1} bullets={len(blts)}")
            if blts:
                all_bullets.append(blts)

        if not all_bullets:
            logger.warning("[LLM] all chunks empty; using fallback.")
            return _fallback_summary(cleaned)

        # === 리듀스 스킵: 맵 결과가 적으면 바로 합치기 ===
        if len(all_bullets) <= 2:
            flat = [b for blts in all_bullets for b in blts]
            flat = _clip_list_str(flat, n_max=8, each_len=140)
            rc, rs = _rule_category_local(cleaned)
            title_guess = (cleaned.splitlines()[0] if cleaned else "Untitled").strip()[:120]
            return {
                "title": title_guess or "Untitled",
                "bullets": flat,
                "category": rc,
                "subcategory": rs,
            }

        logger.info(f"[LLM] reduce {len(all_bullets)} chunk-summaries")
        result = _reduce_summaries(all_bullets)

        # 최종 길이/안전 보정
        result["bullets"] = _clip_list_str(result.get("bullets", []), n_max=8, each_len=140)
        result["title"] = (result.get("title") or "Untitled")[:120]

        # ⬇️ 카테고리 비었거나 미분류면 규칙 보정
        cat, sub = result.get("category") or "", result.get("subcategory") or ""
        if not cat or not sub or cat == "미분류" or sub == "미분류":
            rc, rs = _rule_category_local(cleaned)
            result["category"] = rc
            result["subcategory"] = rs

        return result

    except Exception as e:
        logger.warning(f"LLM summarize fallback used due to: {e}")
        return _fallback_summary(text)
