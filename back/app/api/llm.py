from fastapi import APIRouter, HTTPException

# Support both import roots
try:
    from back.app.schemas.llm import SummarizeRequest, SummarizeResponse  # type: ignore
    from back.infrastructure.llm.ollama_adapter import OllamaAdapter  # type: ignore
except ModuleNotFoundError:
    from app.schemas.llm import SummarizeRequest, SummarizeResponse  # type: ignore
    from infrastructure.llm.ollama_adapter import OllamaAdapter  # type: ignore

router = APIRouter(tags=["LLM"])

@router.post("/llm/summarize", response_model=SummarizeResponse)
def summarize(req: SummarizeRequest):
    try:
        out = OllamaAdapter().summarize(text=req.text, model=req.model or "gemma3-summarizer")
        return SummarizeResponse(ok=True, result=out)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
