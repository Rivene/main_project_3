from pydantic import BaseModel
from typing import Optional

class SummarizeRequest(BaseModel):
    text: str
    model: Optional[str] = "gemma3-summarizer"

class SummarizeResponse(BaseModel):
    ok: bool
    result: str
