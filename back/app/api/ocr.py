from pathlib import Path
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse

# Support both import roots
try:
    from back.application.services.ocr_service_compat import process_ocr  # type: ignore
    from back.infrastructure.storage.local_fs import LocalFS  # type: ignore
except ModuleNotFoundError:
    from application.services.ocr_service_compat import process_ocr  # type: ignore
    from infrastructure.storage.local_fs import LocalFS  # type: ignore

router = APIRouter()
fs = LocalFS()


@router.post("/ocr/tesseract")
async def ocr_tesseract(
    file: UploadFile | None = File(None),
    pdf_path: str | None = Form(None),
    dpi: int = Form(300),
    prep: str = Form("adaptive"),
    langs: str = Form("kor+eng"),
    psm: int = Form(6),
    do_llm_summary: bool = Form(False),
    llm_model: str = Form("gemma3-summarizer"),
    category_id: int | None = Form(None),
    category_name: str | None = Form(None),
):
  
    try:
        # 업로드/경로 처리
        if file:
            file_id = str(uuid.uuid4())
            saved_path = fs.save_upload(file_id, file.filename, await file.read())
            filename = file.filename
        elif pdf_path:
            file_id = str(uuid.uuid4())
            saved_path = fs.copy_from_path(file_id, pdf_path)
            filename = Path(pdf_path).name
        else:
            raise HTTPException(400, "file 또는 pdf_path 중 하나는 필요합니다.")

        result = process_ocr(
            file_path=saved_path,
            file_id=file_id,
            filename=filename,
            dpi=dpi,
            prep=prep,
            langs=langs,
            psm=psm,
            do_summary=do_llm_summary,
            llm_model=llm_model,
            category_id=category_id,
            category_name=category_name,
            fs=fs,
        )

        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{file_id}/{kind}")
def download(file_id: str, kind: str):
    """
    kind: pdf | text | json
    """
    path = fs.get_result_file(file_id, kind)
    if not path.exists():
        raise HTTPException(404, f"{kind} not found for {file_id}")
    media = {
        "pdf": "application/pdf",
        "text": "text/plain; charset=utf-8",
        "json": "application/json; charset=utf-8",
    }.get(kind, "application/octet-stream")
    return FileResponse(path, media_type=media, filename=path.name)
