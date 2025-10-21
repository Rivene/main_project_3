from __future__ import annotations

# Small compatibility shim so this module can be imported
# whether running from repo root (back.*) or inside back/ (app.*).
import sys
from pathlib import Path

try:
    import back  # type: ignore
except ModuleNotFoundError:
    # If running from inside `back/`, add parent of `back` to sys.path
    # so `back.*` imports resolve.
    # __file__ = .../back/application/services/ocr_service_compat.py
    # parents[0]=services, [1]=application, [2]=back, [3]=<repo-root>
    sys.path.append(str(Path(__file__).resolve().parents[3]))

# Re-export the original symbol
from back.application.services.ocr_service import process_ocr  # type: ignore  # noqa: E402,F401
