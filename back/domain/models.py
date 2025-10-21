from dataclasses import dataclass
from pathlib import Path

@dataclass
class OcrResult:
    out_dir: Path
    merged_txt: Path
    merged_json: Path
    merged_pdf: Path

@dataclass
class Document:
    server_file_id: str
    filename: str
    title: str
    size_bytes: int
    summary_text: str | None = None

@dataclass
class Summary:
    file_id: str
    text: str
    category: str
