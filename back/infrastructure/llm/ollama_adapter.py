import os
try:
    from back.llm.ollama_client import summarize as _summarize  # type: ignore
except ModuleNotFoundError:
    from llm.ollama_client import summarize as _summarize  # type: ignore

class OllamaAdapter:
    def summarize(self, text: str, model: str = "gemma3-summarizer") -> str:
        return _summarize(text=text, model=model)
