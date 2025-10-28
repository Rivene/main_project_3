# utils/telemetry.py
import time
import logging
from contextlib import contextmanager
from typing import Dict, List, Any

logger = logging.getLogger("app")

class Telemetry:
    """
    임의의 메타/성능 데이터 모음.
    main.py에서 .merge(perf.to_telemetry()) 형태로 사용.
    """
    def __init__(self):
        self.data: Dict[str, Any] = {}

    def merge(self, payload: Dict[str, Any]):
        if not payload:
            return
        # perf 리스트 합치기
        if "perf" in payload:
            self.data.setdefault("perf", [])
            self.data["perf"].extend(payload["perf"])
        # 그 외 키들은 덮어쓰기
        for k, v in payload.items():
            if k == "perf":
                continue
            self.data[k] = v

class PerfRecorder:
    """
    with perf.step("ocr:filename"):
        ... 작업 ...
    형태로 구간별 ms 기록. enabled=False면 noop.
    """
    def __init__(self, enabled: bool = False):
        self.enabled = enabled
        self.records: List[Dict[str, Any]] = []

    @contextmanager
    def step(self, name: str):
        if not self.enabled:
            # noop 컨텍스트
            yield
            return
        t0 = time.perf_counter()
        try:
            yield
        finally:
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            self.records.append({"name": name, "ms": elapsed_ms})
            logger.debug(f"[PERF] {name}: {elapsed_ms} ms")

    def to_telemetry(self) -> Dict[str, Any]:
        if not self.enabled:
            return {}
        # name 기준 합치는 대신, 기록을 그대로 반환 (타임라인 분석 용이)
        return {"perf": list(self.records)}
