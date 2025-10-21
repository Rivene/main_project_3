# Backend (4-Layer) Scaffold

## Run (dev)
```bash
cd back
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 4000
```

## .env example
```
UPLOADS_DIR=uploads
OUTPUTS_DIR=outputs
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]

ORACLE_USER=dev1234
ORACLE_PASSWORD=1234
ORACLE_HOST=127.0.0.1
ORACLE_PORT=1521
ORACLE_SERVICE_NAME=freepdb1

OLLAMA_BASE=http://127.0.0.1:11434
```

## API
- POST `/api/v1/ocr/tesseract` (multipart/form-data)
  - fields: `file`(PDF) or `pdf_path`, `dpi`, `prep`, `langs`, `psm`, `do_llm_summary`, `llm_model`, `category_id`, `category_name`
- GET `/api/v1/download/{file_id}/{kind}` where kind: `pdf|text|json`
- POST `/api/v1/llm/summarize` (json)

This scaffold reuses your existing OCR pipeline and Ollama client.
