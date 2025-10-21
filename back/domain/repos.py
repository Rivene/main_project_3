from typing import Protocol, Optional

class DocumentRepo(Protocol):
    def save_document(self, *, server_file_id:str, filename:str, title:str, size_bytes:int, summary_text: Optional[str]): ...

class SummaryRepo(Protocol):
    def save_summary(self, *, file_id:str, filename:str, summary:str, category:str): ...
