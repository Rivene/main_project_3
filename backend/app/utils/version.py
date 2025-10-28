# utils/version.py
import os

# 배포 파이프라인에서 ENV로 주입할 수 있게 처리 (없으면 기본)
DEFAULT_VERSION = "0.1.0"

def get_version() -> str:
    return os.getenv("APP_VERSION", DEFAULT_VERSION)
