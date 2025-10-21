from pydantic import BaseModel
from typing import Optional

class OcrResponse(BaseModel):
    ok: bool
    file_id: str
    pdf_path: str
    merged_txt: str
    merged_json: str
    merged_pdf: str
    llm_summary: Optional[str] = None
