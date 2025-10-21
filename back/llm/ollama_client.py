import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json

OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://127.0.0.1:11434")

# ---- 세션/재시도 세팅 ----
_session = requests.Session()
_session.mount("http://", HTTPAdapter(
    max_retries=Retry(
        total=3,
        backoff_factor=1.5,
        status_forcelist=[429, 502, 503, 504]
    )
))

# =====================================================
# ✅ 기본 요약 함수 (스트리밍 제거 버전)
# =====================================================
def summarize(text: str, model: str = "gemma3-summarizer",
              max_chars: int = 15000, timeout_sec: int = 1200) -> str:
    """
    Ollama API를 이용해 문서를 요약합니다.
    실시간 스트리밍 기능은 포함하지 않습니다.
    """
    if not text or not text.strip():
        return "[ERR] 입력 텍스트가 비어 있습니다."

    prompt = f"""
다음 문서를 간결하게 요약하고, 마지막 줄에 '카테고리: 대분류/소분류' 형식으로 작성하세요.

출력 형식:
요약:
(요약 본문)
카테고리: 대분류/소분류
---
{text[:max_chars]}
---
""".strip()

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 512,
        }
    }

    try:
        r = _session.post(f"{OLLAMA_BASE}/api/generate", json=payload, timeout=timeout_sec)
        r.raise_for_status()
        return (r.json().get("response") or "").strip()

    except requests.exceptions.ReadTimeout:
        return f"[ERR] Ollama 읽기 타임아웃(>{timeout_sec}s). 입력을 더 작게 하세요."
    except requests.exceptions.ConnectionError:
        return "[ERR] Ollama 서버에 연결할 수 없습니다. (서비스 실행/포트 확인)"
    except Exception as e:
        return f"[ERR] Ollama 호출 중 오류: {e}"