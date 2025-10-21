from typing import TypedDict
from pathlib import Path
from ocr.tesseract_runner import run_tesseract_pipeline
from infrastructure.storage.local_fs import LocalFS

class OcrRunResult(TypedDict):
    outDir: str
    mergedTxt: str
    mergedJson: str
    mergedPdf: str
    id: str

class TesseractAdapter:
    def __init__(self, fs: LocalFS):
        self.fs = fs

    def run(self, *, pdf: str, dpi: int, prep: str, langs: str, psm: int) -> OcrRunResult:
        return run_tesseract_pipeline(pdf=pdf, out_root=self.fs.outputs_dir, dpi=dpi, prep=prep, langs=langs, psm=psm)
